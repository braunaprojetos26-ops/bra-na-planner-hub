import { useState } from 'react';
import { Plus, Pencil, Package, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useProductCategories,
  useProducts,
  useCreateProductCategory,
  useUpdateProductCategory,
  useCreateProduct,
  useUpdateProduct,
} from '@/hooks/useProducts';
import type { ProductCategory, Product, ProductCustomField } from '@/types/contracts';

export default function AdminProducts() {
  const { data: categories, isLoading: loadingCategories } = useProductCategories(true);
  const { data: products, isLoading: loadingProducts } = useProducts(true);

  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  // Category state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');

  // Product state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category_id: '',
    partner_name: '',
    pb_calculation_type: 'percentage' as 'percentage' | 'fixed',
    pb_value: 0,
    has_validity: false,
    requires_payment_type: true,
  });

  // Category handlers
  const handleOpenCategoryModal = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
    } else {
      setEditingCategory(null);
      setCategoryName('');
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;

    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, name: categoryName.trim() });
    } else {
      await createCategory.mutateAsync({ name: categoryName.trim() });
    }
    setShowCategoryModal(false);
    setCategoryName('');
    setEditingCategory(null);
  };

  const handleToggleCategoryActive = async (category: ProductCategory) => {
    await updateCategory.mutateAsync({ id: category.id, is_active: !category.is_active });
  };

  // Product handlers
  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        category_id: product.category_id || '',
        partner_name: product.partner_name || '',
        pb_calculation_type: product.pb_calculation_type,
        pb_value: product.pb_value,
        has_validity: product.has_validity,
        requires_payment_type: product.requires_payment_type,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        category_id: '',
        partner_name: '',
        pb_calculation_type: 'percentage',
        pb_value: 0,
        has_validity: false,
        requires_payment_type: true,
      });
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) return;

    const data = {
      name: productForm.name.trim(),
      category_id: productForm.category_id || undefined,
      partner_name: productForm.partner_name || undefined,
      pb_calculation_type: productForm.pb_calculation_type,
      pb_value: productForm.pb_value,
      has_validity: productForm.has_validity,
      requires_payment_type: productForm.requires_payment_type,
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
    } else {
      await createProduct.mutateAsync(data);
    }
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const handleToggleProductActive = async (product: Product) => {
    await updateProduct.mutateAsync({ id: product.id, is_active: !product.is_active });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produtos</h1>
        <p className="text-muted-foreground">Gerencie categorias e produtos para contratos</p>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Categorias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Produtos</CardTitle>
                <CardDescription>
                  Configure os produtos que podem ser vendidos em contratos
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenProductModal()} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Produto
              </Button>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <p className="text-muted-foreground text-center py-8">Carregando...</p>
              ) : products?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum produto cadastrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Cálculo PB</TableHead>
                      <TableHead className="w-[100px] text-center">Ativo</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          {product.category?.name || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.partner_name || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {product.pb_calculation_type === 'percentage'
                              ? `${(product.pb_value * 100).toFixed(1)}%`
                              : `${product.pb_value} fixo`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={product.is_active}
                            onCheckedChange={() => handleToggleProductActive(product)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenProductModal(product)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Categorias</CardTitle>
                <CardDescription>
                  Agrupe produtos em categorias para melhor organização
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenCategoryModal()} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Categoria
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCategories ? (
                <p className="text-muted-foreground text-center py-8">Carregando...</p>
              ) : categories?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma categoria cadastrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-[100px] text-center">Ativo</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories?.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={category.is_active}
                            onCheckedChange={() => handleToggleCategoryActive(category)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenCategoryModal(category)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ex: Planejamento Financeiro"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={!categoryName.trim() || createCategory.isPending || updateCategory.isPending}
            >
              {createCategory.isPending || updateCategory.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Produto *</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Planejamento Completo 12 meses"
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={productForm.category_id}
                onValueChange={(v) => setProductForm((f) => ({ ...f, category_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.filter((c) => c.is_active).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Parceiro (opcional)</Label>
              <Input
                value={productForm.partner_name}
                onChange={(e) => setProductForm((f) => ({ ...f, partner_name: e.target.value }))}
                placeholder="Ex: Prudential, Porto Seguro"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Cálculo PB</Label>
                <Select
                  value={productForm.pb_calculation_type}
                  onValueChange={(v: 'percentage' | 'fixed') =>
                    setProductForm((f) => ({ ...f, pb_calculation_type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual</SelectItem>
                    <SelectItem value="fixed">Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {productForm.pb_calculation_type === 'percentage' ? 'Percentual (%)' : 'Valor Fixo'}
                </Label>
                <Input
                  type="number"
                  step={productForm.pb_calculation_type === 'percentage' ? '0.1' : '1'}
                  value={
                    productForm.pb_calculation_type === 'percentage'
                      ? productForm.pb_value * 100
                      : productForm.pb_value
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setProductForm((f) => ({
                      ...f,
                      pb_value: f.pb_calculation_type === 'percentage' ? val / 100 : val,
                    }));
                  }}
                  placeholder={productForm.pb_calculation_type === 'percentage' ? '10' : '5'}
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="has_validity"
                  checked={productForm.has_validity}
                  onCheckedChange={(v) => setProductForm((f) => ({ ...f, has_validity: v }))}
                />
                <Label htmlFor="has_validity" className="font-normal">
                  Possui validade
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="requires_payment_type"
                  checked={productForm.requires_payment_type}
                  onCheckedChange={(v) => setProductForm((f) => ({ ...f, requires_payment_type: v }))}
                />
                <Label htmlFor="requires_payment_type" className="font-normal">
                  Pede forma de pagamento
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={!productForm.name.trim() || createProduct.isPending || updateProduct.isPending}
            >
              {createProduct.isPending || updateProduct.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
