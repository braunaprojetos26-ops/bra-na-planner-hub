import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in BRT (UTC-3)
    const now = new Date();
    const brtOffset = -3 * 60; // -3 hours in minutes
    const brtTime = new Date(now.getTime() + (brtOffset - now.getTimezoneOffset()) * 60 * 1000);
    
    const todayDay = brtTime.getDate();
    const todayMonth = brtTime.getMonth() + 1;
    const todayDateStr = brtTime.toISOString().split('T')[0];

    console.log(`[check-birthdays] Running for day ${todayDay}, month ${todayMonth} (BRT date: ${todayDateStr})`);

    // Get all contacts with birthdays today who have an owner
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, full_name, birth_date, owner_id')
      .not('birth_date', 'is', null)
      .not('owner_id', 'is', null);

    if (contactsError) {
      console.error('[check-birthdays] Error fetching contacts:', contactsError);
      throw contactsError;
    }

    // Filter contacts whose birthday is today
    const birthdayContacts = (contacts || []).filter(contact => {
      if (!contact.birth_date) return false;
      const birthDate = new Date(contact.birth_date);
      return birthDate.getDate() === todayDay && (birthDate.getMonth() + 1) === todayMonth;
    });

    console.log(`[check-birthdays] Found ${birthdayContacts.length} contacts with birthdays today`);

    // Check for existing birthday notifications for today to avoid duplicates
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('id, link')
      .eq('type', 'birthday')
      .gte('created_at', `${todayDateStr}T00:00:00Z`)
      .lt('created_at', `${todayDateStr}T23:59:59Z`);

    const existingContactIds = new Set(
      (existingNotifications || [])
        .map(n => n.link?.match(/\/contacts\/([^/]+)/)?.[1])
        .filter(Boolean)
    );

    // Create notifications for each birthday contact (if not already notified today)
    let createdCount = 0;
    for (const contact of birthdayContacts) {
      if (existingContactIds.has(contact.id)) {
        console.log(`[check-birthdays] Skipping ${contact.full_name} - already notified today`);
        continue;
      }

      // Calculate age
      let ageMessage = '';
      if (contact.birth_date) {
        const birthDate = new Date(contact.birth_date);
        const age = brtTime.getFullYear() - birthDate.getFullYear();
        ageMessage = ` (completa ${age} anos)`;
      }

      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: contact.owner_id,
          type: 'birthday',
          title: '🎂 Aniversário de Cliente',
          message: `${contact.full_name} faz aniversário hoje${ageMessage}!`,
          link: `/contacts/${contact.id}`,
          is_read: false,
        });

      if (insertError) {
        console.error(`[check-birthdays] Error creating notification for ${contact.full_name}:`, insertError);
      } else {
        createdCount++;
        console.log(`[check-birthdays] Created notification for ${contact.full_name} (owner: ${contact.owner_id})`);
      }
    }

    console.log(`[check-birthdays] Created ${createdCount} birthday notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        date: todayDateStr,
        birthdaysFound: birthdayContacts.length,
        notificationsCreated: createdCount 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[check-birthdays] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
