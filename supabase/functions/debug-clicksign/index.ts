const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clicksignApiKey = Deno.env.get("CLICKSIGN_API_KEY")!;
  const results: any = {};

  // Test max page size
  for (const size of [50, 100]) {
    const url = `https://app.clicksign.com/api/v3/envelopes?page[number]=1&page[size]=${size}`;
    const start = Date.now();
    const res = await fetch(url, {
      headers: { "Authorization": clicksignApiKey, "Accept": "application/json" },
    });
    const elapsed = Date.now() - start;
    const data = await res.json();
    
    const envelopeNames = (data.data || []).map((e: any) => e.attributes?.name);
    const hasDanilo = envelopeNames.some((n: string) => n?.toLowerCase().includes("danilo"));
    
    results[`page_size_${size}`] = {
      status: res.status,
      returned: (data.data || []).length,
      total: data.meta?.record_count,
      elapsed_ms: elapsed,
      has_danilo: hasDanilo,
      sample_names: envelopeNames.slice(0, 3),
    };
  }

  // Load page 2 with size 100 to check for Danilo (alphabetical order)
  const url2 = `https://app.clicksign.com/api/v3/envelopes?page[number]=2&page[size]=100`;
  const res2 = await fetch(url2, {
    headers: { "Authorization": clicksignApiKey, "Accept": "application/json" },
  });
  const data2 = await res2.json();
  const names2 = (data2.data || []).map((e: any) => e.attributes?.name);
  const daniloIdx = names2.findIndex((n: string) => n?.toLowerCase().includes("danilo"));
  
  results["page2_size100"] = {
    returned: (data2.data || []).length,
    has_danilo: daniloIdx >= 0,
    danilo_name: daniloIdx >= 0 ? names2[daniloIdx] : null,
    first: names2[0],
    last: names2[names2.length - 1],
  };

  // Try sort parameter
  const urlSort = `https://app.clicksign.com/api/v3/envelopes?page[number]=1&page[size]=5&sort=name`;
  const resSort = await fetch(urlSort, {
    headers: { "Authorization": clicksignApiKey, "Accept": "application/json" },
  });
  const dataSort = await resSort.json();
  results["sorted_by_name"] = {
    status: resSort.status,
    names: (dataSort.data || []).map((e: any) => e.attributes?.name),
  };

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
