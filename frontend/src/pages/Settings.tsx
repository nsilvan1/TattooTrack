import { Card, CardContent } from '../components/ui'
import { Settings as SettingsIcon, Info } from 'lucide-react'

export default function Settings() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>
        <p className="text-text-secondary mt-1">Gerencie as configurações do sistema</p>
      </div>

      <Card>
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Info className="w-4 h-4 text-text-secondary" />
            Sobre o Sistema
          </h2>
        </div>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-text-secondary">Versão</span>
            <span className="text-text-primary">1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-text-secondary">Sistema</span>
            <span className="text-text-primary">TattooTrack</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-text-secondary">Desenvolvido com</span>
            <span className="text-text-primary">React + TypeScript + TailwindCSS</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-text-secondary" />
            Configurações Gerais
          </h2>
        </div>
        <CardContent>
          <p className="text-text-secondary text-sm">
            Mais configurações serão adicionadas em futuras atualizações.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
