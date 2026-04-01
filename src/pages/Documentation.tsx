import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Copy } from 'lucide-react';
import logo from '@/assets/logo.png';

const ENDPOINTS = [
  {
    title: 'Limpar Diretórios',
    curl: `curl -X DELETE http://SEU_DOMINIO/clear-storage \\
  -H "Authorization: Bearer SEU_ADMIN_TOKEN"`,
  },
  {
    title: 'Registrar Usuário',
    curl: `curl -X POST http://SEU_DOMINIO/register \\
  -H "Authorization: Bearer SEU_ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Nome","email":"email@example.com","password":"senha"}'`,
  },
  {
    title: 'Gerar Imagem',
    curl: `curl -X POST http://SEU_DOMINIO/generate-image \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer SEU_ADMIN_TOKEN" \\
  -d '{
    "baseImage":"URL_da_imagem_base",
    "overlayImage":"URL_publica",
    "text":"Texto Exemplo",
    "textColor":"#000000",
    "textSize":20,
    "textPosX":50,
    "textPosY":50,
    "overlaySize":100,
    "overlayPosX":10,
    "overlayPosY":10,
    "overlayRadius":20
  }'`,
    response: `Status: 200 OK

{
  "processedImageUrl": "https://seu-dominio.com/imagens/resultado.png"
}`,
  },
];

const Documentation = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'cURL copiado para a área de transferência.' });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/Dynamimages">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <img src={logo} alt="Nowtomation" className="h-8 w-8" />
          <h1 className="text-lg font-semibold text-foreground">Documentação de Endpoints</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {ENDPOINTS.map((ep) => (
          <Card key={ep.title} className="shadow-card animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{ep.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-xs text-foreground">
                {ep.curl}
              </pre>

              {ep.response && (
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-xs text-foreground">
                  {ep.response}
                </pre>
              )}

              <Button variant="outline" className="w-full" onClick={() => copyToClipboard(ep.curl)}>
                <Copy className="mr-2 h-4 w-4" /> Copiar cURL
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default Documentation;
