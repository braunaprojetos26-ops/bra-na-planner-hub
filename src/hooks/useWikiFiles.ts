import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WikiCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  order_position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WikiItem {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  item_type: 'folder' | 'file' | 'link';
  href: string | null;
  parent_id: string | null;
  keywords: string[];
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  order_position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: WikiCategory;
}

// Fetch all categories
export function useWikiCategories() {
  return useQuery({
    queryKey: ['wiki-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_categories')
        .select('*')
        .eq('is_active', true)
        .order('order_position');
      
      if (error) throw error;
      return data as WikiCategory[];
    },
  });
}

// Fetch category by slug
export function useWikiCategoryBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['wiki-category', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('wiki_categories')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as WikiCategory | null;
    },
    enabled: !!slug,
  });
}

// Fetch items by category and optionally by parent
export function useWikiItems(categoryId: string | undefined, parentId: string | null = null) {
  return useQuery({
    queryKey: ['wiki-items', categoryId, parentId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      let query = supabase
        .from('wiki_items')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('order_position');
      
      if (parentId) {
        query = query.eq('parent_id', parentId);
      } else {
        query = query.is('parent_id', null);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as WikiItem[];
    },
    enabled: !!categoryId,
  });
}

// Fetch single item by ID
export function useWikiItem(itemId: string | undefined) {
  return useQuery({
    queryKey: ['wiki-item', itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const { data, error } = await supabase
        .from('wiki_items')
        .select('*, category:wiki_categories(*)')
        .eq('id', itemId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as (WikiItem & { category: WikiCategory }) | null;
    },
    enabled: !!itemId,
  });
}

// Search wiki items globally
export function useSearchWiki(searchTerm: string) {
  return useQuery({
    queryKey: ['wiki-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('wiki_items')
        .select('*, category:wiki_categories(*)')
        .eq('is_active', true)
        .or(`title.ilike.%${searchTerm}%,keywords.cs.{${searchTerm.toLowerCase()}}`)
        .order('title')
        .limit(20);
      
      if (error) throw error;
      return data as (WikiItem & { category: WikiCategory })[];
    },
    enabled: searchTerm.length >= 2,
  });
}

// Create category mutation
export function useCreateWikiCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (category: Omit<WikiCategory, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('wiki_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-categories'] });
      toast({ title: 'Categoria criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' });
    },
  });
}

// Update category mutation
export function useUpdateWikiCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WikiCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('wiki_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-categories'] });
      toast({ title: 'Categoria atualizada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar categoria', description: error.message, variant: 'destructive' });
    },
  });
}

// Delete category mutation (soft delete)
export function useDeleteWikiCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wiki_categories')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-categories'] });
      toast({ title: 'Categoria removida com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover categoria', description: error.message, variant: 'destructive' });
    },
  });
}

// Create item mutation
export function useCreateWikiItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<WikiItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('wiki_items')
        .insert(item)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-items'] });
      toast({ title: 'Item criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar item', description: error.message, variant: 'destructive' });
    },
  });
}

// Update item mutation
export function useUpdateWikiItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WikiItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('wiki_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-items'] });
      queryClient.invalidateQueries({ queryKey: ['wiki-search'] });
      toast({ title: 'Item atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar item', description: error.message, variant: 'destructive' });
    },
  });
}

// Delete item mutation (soft delete)
export function useDeleteWikiItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: WikiItem) => {
      // If it's a file, also delete from storage
      if (item.item_type === 'file' && item.file_path) {
        const { error: storageError } = await supabase.storage
          .from('wiki-files')
          .remove([item.file_path]);
        
        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
        }
      }
      
      const { error } = await supabase
        .from('wiki_items')
        .update({ is_active: false })
        .eq('id', item.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-items'] });
      queryClient.invalidateQueries({ queryKey: ['wiki-search'] });
      toast({ title: 'Item removido com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover item', description: error.message, variant: 'destructive' });
    },
  });
}

// Upload file mutation
export function useUploadWikiFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      file,
      categoryId,
      parentId,
      title,
      description,
      keywords,
    }: {
      file: File;
      categoryId: string;
      parentId: string | null;
      title: string;
      description: string;
      keywords: string[];
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${categoryId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('wiki-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create wiki item record
      const { data, error } = await supabase
        .from('wiki_items')
        .insert({
          category_id: categoryId,
          parent_id: parentId,
          title,
          description: description || null,
          icon: getFileIcon(file.type),
          item_type: 'file',
          keywords,
          file_path: filePath,
          file_name: file.name,
          file_type: fileExt || 'unknown',
          file_size: file.size,
          uploaded_by: user.id,
          is_active: true,
          order_position: 0,
        })
        .select()
        .single();

      if (error) {
        // Rollback: delete uploaded file
        await supabase.storage.from('wiki-files').remove([filePath]);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki-items'] });
      toast({ title: 'Arquivo enviado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao enviar arquivo', description: error.message, variant: 'destructive' });
    },
  });
}

// Get file download URL
export function getFileDownloadUrl(filePath: string): string {
  const { data } = supabase.storage.from('wiki-files').getPublicUrl(filePath);
  return data.publicUrl;
}

// Helper function to get icon based on file type
function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'FileText';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'FileText';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Table';
  if (mimeType.includes('image')) return 'Image';
  return 'File';
}

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
