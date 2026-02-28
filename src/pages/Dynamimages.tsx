import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { uploadBaseImage, clearStorage, getApiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileQuestion, Trash2, Copy, LogOut, ImagePlus } from 'lucide-react';
import logo from '@/assets/logo.png';

const FONTS = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Tahoma', 'Comic Sans MS', 'Trebuchet MS', 'Lucida Sans'];
const WEIGHTS = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Negrito' },
  { value: 'lighter', label: 'Mais leve' },
  { value: '100', label: '100' },
  { value: '300', label: '300' },
  { value: '500', label: '500' },
  { value: '700', label: '700' },
  { value: '900', label: '900' },
];
const ALIGNS = [
  { value: 'left', label: 'Esquerda' },
  { value: 'center', label: 'Centralizado' },
  { value: 'right', label: 'Direita' },
];

const Dynamimages = () => {
  const { logout, apiToken, setApiToken } = useAuth();
  const { toast } = useToast();

  const [baseImageUrl, setBaseImageUrl] = useState('');
  const [basePreviewUrl, setBasePreviewUrl] = useState('');
  const [overlayPreviewUrl, setOverlayPreviewUrl] = useState('');

  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [textSize, setTextSize] = useState(20);
  const [textPosX, setTextPosX] = useState(0);
  const [textPosY, setTextPosY] = useState(0);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontWeight, setFontWeight] = useState('bold');
  const [textAlign, setTextAlign] = useState('center');

  const [overlaySize, setOverlaySize] = useState(100);
  const [overlayPosX, setOverlayPosX] = useState(0);
  const [overlayPosY, setOverlayPosY] = useState(0);
  const [borderRadius, setBorderRadius] = useState(0);

  const [curlCommand, setCurlCommand] = useState('');

  const baseInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const handleBaseImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBasePreviewUrl(URL.createObjectURL(file));
    try {
      const url = await uploadBaseImage(file, apiToken);
      setBaseImageUrl(url);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleOverlayImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOverlayPreviewUrl(URL.createObjectURL(file));
    }
  };

  const generateCurl = useCallback(() => {
    const origin = window.location.origin;
    const cmd = `curl -X POST "${getApiUrl('/generate-image') || origin + '/generate-image'}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiToken}" \\
  -d '{
  "baseImage": "${baseImageUrl}",
  "overlayImage": "<url da imagem de overlay aqui>",
  "text": "${text}",
  "textColor": "${textColor}",
  "textSize": "${textSize}",
  "textPosX": "${textPosX}",
  "textPosY": "${textPosY}",
  "fontFamily": "${fontFamily}",
  "fontWeight": "${fontWeight}",
  "textAlign": "${textAlign}",
  "overlaySize": "${overlaySize}",
  "overlayPosX": "${overlayPosX}",
  "overlayPosY": "${overlayPosY}",
  "overlayRadius": "${borderRadius}"
}'`;
    setCurlCommand(cmd);
  }, [baseImageUrl, text, textColor, textSize, textPosX, textPosY, fontFamily, fontWeight, textAlign, overlaySize, overlayPosX, overlayPosY, borderRadius, apiToken]);

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    toast({ title: 'Copiado!', description: 'cURL copiado para a área de transferência.' });
  };

  const handleClearStorage = async () => {
    if (!confirm('Tem certeza que deseja apagar todas as imagens? Isso pode interromper automações.')) return;
    try {
      const msg = await clearStorage(apiToken);
      toast({ title: 'Sucesso', description: msg });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Nowtomation" className="h-8 w-8" />
            <h1 className="text-lg font-semibold text-foreground">Dynamimages</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/Documentation">
              <Button variant="ghost" size="sm">
                <FileQuestion className="mr-1 h-4 w-4" /> Docs
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleClearStorage}>
              <Trash2 className="mr-1 h-4 w-4" /> Limpar
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="mr-1 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* API Token config */}
        <Card className="mb-6 shadow-card animate-fade-in">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Label className="shrink-0 text-sm font-medium">API Token:</Label>
              <Input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Cole seu token de API aqui"
                className="font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left panel - Controls */}
          <div className="space-y-6 animate-fade-in">
            {/* Upload section */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Imagens & Texto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Imagem Base</Label>
                  <Input ref={baseInputRef} type="file" accept="image/*" onChange={handleBaseImage} />
                </div>
                <div className="space-y-2">
                  <Label>Imagem Sobreposta</Label>
                  <Input ref={overlayInputRef} type="file" accept="image/*" onChange={handleOverlayImage} />
                </div>
                <div className="space-y-2">
                  <Label>Texto</Label>
                  <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite seu texto" />
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Controles de Overlay</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Tamanho: {overlaySize}px</Label>
                    <Slider min={10} max={500} step={1} value={[overlaySize]} onValueChange={([v]) => setOverlaySize(v)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Posição X: {overlayPosX}px</Label>
                    <Slider min={-350} max={350} step={1} value={[overlayPosX]} onValueChange={([v]) => setOverlayPosX(v)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Posição Y: {overlayPosY}px</Label>
                    <Slider min={-800} max={800} step={1} value={[overlayPosY]} onValueChange={([v]) => setOverlayPosY(v)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Border Radius: {borderRadius}%</Label>
                    <Slider min={0} max={100} step={1} value={[borderRadius]} onValueChange={([v]) => setBorderRadius(v)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Text controls */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Controles de Texto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Cor do Texto</Label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-8 w-full cursor-pointer rounded border border-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tamanho: {textSize}px</Label>
                    <Slider min={5} max={100} step={1} value={[textSize]} onValueChange={([v]) => setTextSize(v)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Posição X: {textPosX}px</Label>
                    <Slider min={-350} max={350} step={1} value={[textPosX]} onValueChange={([v]) => setTextPosX(v)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Posição Y: {textPosY}px</Label>
                    <Slider min={-800} max={800} step={1} value={[textPosY]} onValueChange={([v]) => setTextPosY(v)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fonte</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Peso da Fonte</Label>
                    <Select value={fontWeight} onValueChange={setFontWeight}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WEIGHTS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Alinhamento</Label>
                    <Select value={textAlign} onValueChange={setTextAlign}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALIGNS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* cURL */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Comando cURL</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="brand" className="w-full" onClick={generateCurl}>
                  Gerar cURL
                </Button>
                <Textarea value={curlCommand} readOnly className="font-mono text-xs min-h-[120px]" />
                <Button variant="outline" className="w-full" onClick={copyCurl} disabled={!curlCommand}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar cURL
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right panel - Preview */}
          <div className="lg:sticky lg:top-20 lg:self-start animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" /> Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="relative mx-auto overflow-hidden rounded-lg border bg-muted"
                  style={{ width: 350, minHeight: 350, maxHeight: 800 }}
                >
                  {basePreviewUrl && (
                    <img src={basePreviewUrl} alt="Base" style={{ width: 350, height: '100%' }} />
                  )}
                  {overlayPreviewUrl && (
                    <img
                      src={overlayPreviewUrl}
                      alt="Overlay"
                      className="absolute"
                      style={{
                        width: overlaySize,
                        height: overlaySize,
                        top: overlayPosY,
                        left: overlayPosX,
                        borderRadius: `${borderRadius}%`,
                      }}
                    />
                  )}
                  {text && (
                    <div
                      className="absolute"
                      style={{
                        color: textColor,
                        fontSize: textSize,
                        fontFamily,
                        fontWeight,
                        textAlign: textAlign as any,
                        left: textPosX,
                        top: textPosY,
                      }}
                    >
                      {text}
                    </div>
                  )}
                  {!basePreviewUrl && !overlayPreviewUrl && !text && (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground text-sm">
                      Envie uma imagem para começar
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dynamimages;
