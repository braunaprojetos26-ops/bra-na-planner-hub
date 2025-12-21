import { useState, useMemo } from 'react';
import { Plus, Pencil, Package, FolderOpen, Calculator, HelpCircle, Lightbulb, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useProductCategories,
  useProducts,
  useCreateProductCategory,
  useUpdateProductCategory,
  useDeleteProductCategory,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/useProducts';
import {
  CONTRACT_VARIABLES,
  PRODUCT_CONSTANTS,
  validateFormula,
  previewCalculation,
  getFormulaExamples,
  type ContractVariableKey,
  type ProductConstantKey,
} from '@/lib/pbFormulaParser';
import type { ProductCategory, Product } from '@/types/contracts';

export default function AdminProducts() {
  const { data: categories, isLoading: loadingCategories } = useProductCategories(true);
  const { data: products, isLoading: loadingProducts } = useProducts(true);

  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();
  const deleteCategory = useDeleteProductCategory();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

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
    has_validity: false,
    requires_payment_type: true,
    // New formula fields
    pb_formula: '',
    pb_variables: [] as ContractVariableKey[],
    pb_constants: {} as Partial<Record<ProductConstantKey, number>>,
  });

  // Formula test state
  const [testValues, setTestValues] = useState<Record<string, number>>({});
  const [showExamples, setShowExamples] = useState(false);

  // Formula validation
  const formulaValidation = useMemo(() => {
    if (!productForm.pb_formula) return { valid: true };
    return validateFormula(
      productForm.pb_formula,
      productForm.pb_variables,
      Object.keys(productForm.pb_constants) as ProductConstantKey[]
    );
  }, [productForm.pb_formula, productForm.pb_variables, productForm.pb_constants]);

  // Preview calculation
  const previewResult = useMemo(() => {
    if (!productForm.pb_formula || !formulaValidation.valid) return null;
    
    const allValues: Record<string, number> = { ...testValues };
    for (const [key, value] of Object.entries(productForm.pb_constants)) {
      allValues[key] = value;
    }
    
    // Check if all required variables have test values
    const hasAllValues = productForm.pb_variables.every(
      (v) => typeof testValues[v] === 'number' && testValues[v] > 0
    );
    
    if (!hasAllValues) return null;
    
    return previewCalculation(productForm.pb_formula, allValues);
  }, [productForm.pb_formula, productForm.pb_variables, productForm.pb_constants, testValues, formulaValidation.valid]);

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
        has_validity: product.has_validity,
        requires_payment_type: product.requires_payment_type,
        pb_formula: product.pb_formula || '',
        pb_variables: product.pb_variables || [],
        pb_constants: (product.pb_constants || {}) as Partial<Record<ProductConstantKey, number>>,
      });
      // Initialize test values for existing variables
      const initialTestValues: Record<string, number> = {};
      (product.pb_variables || []).forEach((v) => {
        initialTestValues[v] = 1000;
      });
      setTestValues(initialTestValues);
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        category_id: '',
        partner_name: '',
        has_validity: false,
        requires_payment_type: true,
        pb_formula: '',
        pb_variables: [],
        pb_constants: {} as Partial<Record<ProductConstantKey, number>>,
      });
      setTestValues({});
    }
    setShowProductModal(true);
    setShowExamples(false);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) return;
    if (productForm.pb_formula && !formulaValidation.valid) return;

    const data = {
      name: productForm.name.trim(),
      category_id: productForm.category_id || undefined,
      partner_name: productForm.partner_name || undefined,
      has_validity: productForm.has_validity,
      requires_payment_type: productForm.requires_payment_type,
      pb_formula: productForm.pb_formula || undefined,
      pb_variables: productForm.pb_variables,
      pb_constants: productForm.pb_constants,
      // Legacy fields - set defaults
      pb_calculation_type: 'percentage' as const,
      pb_value: 0,
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

  const handleToggleVariable = (variable: ContractVariableKey, checked: boolean) => {
    setProductForm((f) => ({
      ...f,
      pb_variables: checked
        ? [...f.pb_variables, variable]
        : f.pb_variables.filter((v) => v !== variable),
    }));
    if (checked) {
      setTestValues((v) => ({ ...v, [variable]: 1000 }));
    }
  };

  const handleToggleConstant = (constant: ProductConstantKey, checked: boolean) => {
    setProductForm((f) => {
      const newConstants = { ...f.pb_constants };
      if (checked) {
        newConstants[constant] = PRODUCT_CONSTANTS[constant].defaultValue;
      } else {
        delete newConstants[constant];
      }
      return { ...f, pb_constants: newConstants };
    });
  };

  const handleConstantValueChange = (constant: ProductConstantKey, value: number) => {
    setProductForm((f) => ({
      ...f,
      pb_constants: { ...f.pb_constants, [constant]: value },
    }));
  };

  const handleApplyExample = (example: ReturnType<typeof getFormulaExamples>[0]) => {
    setProductForm((f) => ({
      ...f,
      pb_formula: example.formula,
      pb_variables: example.variables,
      pb_constants: example.constants.reduce((acc, c) => {
        acc[c] = PRODUCT_CONSTANTS[c].defaultValue;
        return acc;
      }, {} as Record<ProductConstantKey, number>),
    }));
    const initialTestValues: Record<string, number> = {};
    example.variables.forEach((v) => {
      initialTestValues[v] = 1000;
    });
    setTestValues(initialTestValues);
    setShowExamples(false);
  };

  const formatPBDisplay = (product: Product) => {
    if (product.pb_formula) {
      return product.pb_formula.length > 30
        ? product.pb_formula.substring(0, 30) + '...'
        : product.pb_formula;
    }
    return product.pb_calculation_type === 'percentage'
      ? `${(product.pb_value * 100).toFixed(1)}%`
      : `${product.pb_value} fixo`;
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
                      <TableHead>Fórmula PB</TableHead>
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {formatPBDisplay(product)}
                                </Badge>
                              </TooltipTrigger>
                              {product.pb_formula && (
                                <TooltipContent>
                                  <p className="font-mono">{product.pb_formula}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={product.is_active}
                            onCheckedChange={() => handleToggleProductActive(product)}
                          />
                        </TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenProductModal(product)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir produto</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o produto "{product.name}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteProduct.mutate(product.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
                        <TableCell className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenCategoryModal(category)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a categoria "{category.name}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteCategory.mutate(category.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Produto *</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Planejamento Completo 12 meses"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={productForm.category_id}
                    onValueChange={(v) => setProductForm((f) => ({ ...f, category_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
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
                    placeholder="Ex: Prudential"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
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

            <Separator />

            {/* PB Formula Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Cálculo de PBs</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExamples(!showExamples)}
                  className="gap-2"
                >
                  <Lightbulb className="w-4 h-4" />
                  Exemplos
                </Button>
              </div>

              {/* Examples */}
              <Collapsible open={showExamples} onOpenChange={setShowExamples}>
                <CollapsibleContent>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2 mb-4">
                    <p className="text-sm font-medium mb-3">Clique para aplicar um exemplo:</p>
                    <div className="grid gap-2">
                      {getFormulaExamples().map((example) => (
                        <Button
                          key={example.name}
                          variant="ghost"
                          className="justify-start h-auto py-2 px-3"
                          onClick={() => handleApplyExample(example)}
                        >
                          <div className="text-left">
                            <p className="font-medium">{example.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{example.formula}</p>
                            <p className="text-xs text-muted-foreground">{example.description}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Contract Variables */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Variáveis do Contrato</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Campos que o planejador preenche ao reportar o contrato</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(CONTRACT_VARIABLES) as [ContractVariableKey, typeof CONTRACT_VARIABLES[ContractVariableKey]][]).map(
                    ([key, config]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`var-${key}`}
                          checked={productForm.pb_variables.includes(key)}
                          onCheckedChange={(checked) => handleToggleVariable(key, checked === true)}
                        />
                        <Label htmlFor={`var-${key}`} className="font-normal text-sm cursor-pointer">
                          {config.label}
                          <code className="ml-1 text-xs text-muted-foreground">{`{${key}}`}</code>
                        </Label>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Product Constants */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Constantes do Produto</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Valores fixos configurados aqui, não aparecem para o planejador</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="space-y-3">
                  {(Object.entries(PRODUCT_CONSTANTS) as [ProductConstantKey, typeof PRODUCT_CONSTANTS[ProductConstantKey]][]).map(
                    ([key, config]) => (
                      <div key={key} className="flex items-center gap-3">
                        <Checkbox
                          id={`const-${key}`}
                          checked={key in productForm.pb_constants}
                          onCheckedChange={(checked) => handleToggleConstant(key, checked === true)}
                        />
                        <Label htmlFor={`const-${key}`} className="font-normal text-sm min-w-[160px]">
                          {config.label}
                          <code className="ml-1 text-xs text-muted-foreground">{`{${key}}`}</code>
                        </Label>
                        {key in productForm.pb_constants && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step={config.type === 'percentage' ? '0.01' : '1'}
                              className="w-24"
                              value={
                                config.type === 'percentage'
                                  ? (productForm.pb_constants[key] * 100).toFixed(0)
                                  : productForm.pb_constants[key]
                              }
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleConstantValueChange(
                                  key,
                                  config.type === 'percentage' ? val / 100 : val
                                );
                              }}
                            />
                            {config.type === 'percentage' && (
                              <span className="text-sm text-muted-foreground">%</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Formula Input */}
              <div className="space-y-2">
                <Label>Fórmula de PB</Label>
                <Textarea
                  value={productForm.pb_formula}
                  onChange={(e) => setProductForm((f) => ({ ...f, pb_formula: e.target.value }))}
                  placeholder="Ex: ({valor_total} * {comissao_pct}) / 100"
                  className="font-mono text-sm"
                  rows={2}
                />
                {productForm.pb_formula && !formulaValidation.valid && (
                  <p className="text-sm text-destructive">{formulaValidation.error}</p>
                )}
                {productForm.pb_variables.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Variáveis disponíveis:{' '}
                    {productForm.pb_variables.map((v) => `{${v}}`).join(', ')}
                    {Object.keys(productForm.pb_constants).length > 0 && ', '}
                    {Object.keys(productForm.pb_constants).map((c) => `{${c}}`).join(', ')}
                  </p>
                )}
              </div>

              {/* Preview */}
              {productForm.pb_formula && formulaValidation.valid && productForm.pb_variables.length > 0 && (
                <div className="p-4 bg-primary/10 rounded-lg space-y-3">
                  <p className="text-sm font-medium">Testar Fórmula</p>
                  <div className="grid grid-cols-2 gap-3">
                    {productForm.pb_variables.map((variable) => (
                      <div key={variable} className="space-y-1">
                        <Label className="text-xs">{CONTRACT_VARIABLES[variable].label}</Label>
                        <Input
                          type="number"
                          value={testValues[variable] || ''}
                          onChange={(e) =>
                            setTestValues((v) => ({
                              ...v,
                              [variable]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                  {previewResult?.success && (
                    <div className="flex items-center gap-2 pt-2">
                      <Calculator className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        Resultado: <strong>{previewResult.result?.toFixed(2)} PBs</strong>
                      </span>
                    </div>
                  )}
                  {previewResult && !previewResult.success && (
                    <p className="text-sm text-destructive">{previewResult.error}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={
                !productForm.name.trim() ||
                (productForm.pb_formula && !formulaValidation.valid) ||
                createProduct.isPending ||
                updateProduct.isPending
              }
            >
              {createProduct.isPending || updateProduct.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
