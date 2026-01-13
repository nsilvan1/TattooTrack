import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  Sparkles,
  Users,
  Calendar,
  DollarSign,
  ArrowRight,
  Check,
  Tag,
  Clock,
  Shield,
  BarChart3,
  Bell,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Package,
  FileText,
  Image,
  Search
} from 'lucide-react'

const modules = [
  {
    id: 'clients',
    icon: Users,
    title: 'Gestão de Clientes',
    subtitle: 'Tudo sobre seus clientes em um só lugar',
    features: [
      'Cadastro completo com foto e dados pessoais',
      'Histórico de todos os trabalhos realizados',
      'Registro de alergias e contraindicações',
      'Fotos de referência e inspirações',
      'Anotações e preferências do cliente',
      'Sistema de tags para organização'
    ],
    mockup: {
      title: 'Clientes',
      stats: [
        { label: 'Total', value: '247' },
        { label: 'Novos (mês)', value: '18' },
        { label: 'VIP', value: '34' }
      ],
      items: [
        { name: 'Lucas Mendes', tag: 'VIP', tagColor: 'bg-pink-500', status: 'Agendado' },
        { name: 'Mariana Costa', tag: 'Retorno', tagColor: 'bg-orange-500', status: 'Em andamento' },
        { name: 'Pedro Silva', tag: 'Novo', tagColor: 'bg-blue-500', status: 'Orçamento' }
      ]
    }
  },
  {
    id: 'calendar',
    icon: Calendar,
    title: 'Agenda Inteligente',
    subtitle: 'Nunca mais perca um agendamento',
    features: [
      'Calendário visual mensal e semanal',
      'Sincronização com Google Calendar',
      'Lembretes automáticos por email',
      'Bloqueio de horários indisponíveis',
      'Visualização por artista (multi-usuário)',
      'Confirmação de presença do cliente'
    ],
    mockup: {
      title: 'Agenda - Janeiro 2025',
      stats: [
        { label: 'Hoje', value: '3' },
        { label: 'Semana', value: '12' },
        { label: 'Mês', value: '47' }
      ],
      calendar: true
    }
  },
  {
    id: 'finances',
    icon: DollarSign,
    title: 'Controle Financeiro',
    subtitle: 'Saiba exatamente quanto você fatura',
    features: [
      'Dashboard com faturamento em tempo real',
      'Controle de depósitos e sinais',
      'Relatório de receitas por período',
      'Gráficos de evolução mensal',
      'Filtros por cliente e tipo de serviço',
      'Exportação de relatórios'
    ],
    mockup: {
      title: 'Financeiro',
      stats: [
        { label: 'Mês atual', value: 'R$ 12.450' },
        { label: 'Pendente', value: 'R$ 3.200' },
        { label: 'Recebido', value: 'R$ 9.250' }
      ],
      chart: true
    }
  },
  {
    id: 'inventory',
    icon: Package,
    title: 'Controle de Estoque',
    subtitle: 'Gerencie seus materiais e insumos',
    features: [
      'Cadastro de produtos e materiais',
      'Alertas de estoque baixo',
      'Controle de validade',
      'Histórico de compras',
      'Custo por sessão estimado',
      'Fornecedores cadastrados'
    ],
    mockup: {
      title: 'Estoque',
      stats: [
        { label: 'Itens', value: '156' },
        { label: 'Baixo estoque', value: '8' },
        { label: 'Vencendo', value: '3' }
      ],
      items: [
        { name: 'Tinta Preta 500ml', tag: 'OK', tagColor: 'bg-emerald-500', status: '12 un' },
        { name: 'Agulhas RL 3', tag: 'Baixo', tagColor: 'bg-amber-500', status: '5 un' },
        { name: 'Luvas P', tag: 'OK', tagColor: 'bg-emerald-500', status: '200 un' }
      ]
    }
  }
]

const additionalFeatures = [
  { icon: BarChart3, title: 'Relatórios Detalhados', desc: 'Analise seu desempenho com gráficos e métricas' },
  { icon: Bell, title: 'Notificações', desc: 'Lembretes automáticos para você e seus clientes' },
  { icon: Image, title: 'Portfólio Digital', desc: 'Galeria de trabalhos organizados por estilo' },
  { icon: FileText, title: 'Orçamentos', desc: 'Crie e envie orçamentos profissionais' },
  { icon: Search, title: 'Busca Avançada', desc: 'Encontre qualquer informação em segundos' },
  { icon: Smartphone, title: 'Mobile First', desc: 'Acesse de qualquer dispositivo, em qualquer lugar' }
]

const included = [
  'Clientes ilimitados',
  'Agendamentos ilimitados',
  'Controle financeiro completo',
  'Gestão de estoque',
  'Sincronização Google Calendar',
  'Relatórios e gráficos',
  'Acesso mobile',
  'Suporte prioritário'
]

function MockupCard({ module }: { module: typeof modules[0] }) {
  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <module.icon className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-text-primary">{module.mockup.title}</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-4 border-b border-white/5">
        {module.mockup.stats.map((stat, i) => (
          <div key={i} className="text-center">
            <p className="text-lg font-bold text-text-primary">{stat.value}</p>
            <p className="text-xs text-text-secondary">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {module.mockup.items && (
          <div className="space-y-2">
            {module.mockup.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.name}</p>
                    <p className="text-xs text-text-secondary">{item.status}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs text-white ${item.tagColor}`}>
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
        )}

        {module.mockup.calendar && (
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-secondary">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[...Array(31)].map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs
                    ${i === 14 ? 'bg-violet-500 text-white font-bold' : ''}
                    ${[5, 12, 19, 23, 28].includes(i) ? 'bg-emerald-500/20 text-emerald-400' : ''}
                    ${![5, 12, 14, 19, 23, 28].includes(i) ? 'text-text-secondary hover:bg-white/5' : ''}
                  `}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {module.mockup.chart && (
          <div className="space-y-3">
            <div className="flex items-end justify-between h-24 gap-2">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-violet-600 to-violet-400 transition-all hover:from-violet-500 hover:to-violet-300"
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-xs text-text-secondary">
                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'][i]}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-text-secondary">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>+23% vs mês anterior</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Landing() {
  const [activeModule, setActiveModule] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(() => {
      setActiveModule((prev) => (prev + 1) % modules.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const currentModule = modules[activeModule]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-text-primary">TattooTrack</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 text-sm rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium transition-all shadow-lg shadow-violet-500/20"
              >
                Começar grátis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-violet-300 mb-6">
            <Sparkles className="w-4 h-4" />
            <span>A plataforma completa para tatuadores profissionais</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6 leading-tight">
            Gerencie seu estúdio
            <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              de forma profissional
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
            Clientes, agendamentos, finanças e estoque em uma única plataforma.
            Tenha controle total do seu negócio e impressione seus clientes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-lg transition-all shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 flex items-center justify-center gap-2"
            >
              Testar grátis por 7 dias
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-text-secondary text-sm">
              Sem cartão de crédito • Cancele quando quiser
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              Conheça os módulos do sistema
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Clique para explorar cada funcionalidade
            </p>
          </div>

          {/* Module Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {modules.map((module, index) => (
              <button
                key={module.id}
                onClick={() => {
                  setActiveModule(index)
                  setIsAutoPlaying(false)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  activeModule === index
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                    : 'glass text-text-secondary hover:text-text-primary hover:bg-white/10'
                }`}
              >
                <module.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{module.title.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Module Content */}
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Info */}
            <div className="order-2 lg:order-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <currentModule.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-text-primary">{currentModule.title}</h3>
                  <p className="text-text-secondary">{currentModule.subtitle}</p>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {currentModule.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-text-primary">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Navigation */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setActiveModule((prev) => (prev - 1 + modules.length) % modules.length)
                    setIsAutoPlaying(false)
                  }}
                  className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-text-secondary" />
                </button>
                <div className="flex gap-2">
                  {modules.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveModule(i)
                        setIsAutoPlaying(false)
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        activeModule === i ? 'bg-violet-500 w-6' : 'bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    setActiveModule((prev) => (prev + 1) % modules.length)
                    setIsAutoPlaying(false)
                  }}
                  className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
            </div>

            {/* Mockup */}
            <div className="order-1 lg:order-2">
              <MockupCard module={currentModule} />
            </div>
          </div>
        </div>
      </section>

      {/* More Features */}
      <section className="py-16 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              E muito mais recursos
            </h2>
            <p className="text-text-secondary">
              Tudo que você precisa para profissionalizar seu estúdio
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {additionalFeatures.map((feature, i) => (
              <div key={i} className="glass rounded-xl p-5 hover:bg-white/[0.08] transition-all group">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">{feature.title}</h3>
                <p className="text-text-secondary text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              Investimento que se paga
            </h2>
            <p className="text-text-secondary">
              Menos que o valor de uma sessão pequena por mês
            </p>
          </div>

          <div className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 -translate-y-full">
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold shadow-lg">
                  7 dias grátis
                </span>
              </div>

              <div className="text-center mb-8 pt-4">
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-text-secondary text-xl">R$</span>
                  <span className="text-6xl font-bold text-text-primary">49</span>
                  <span className="text-text-secondary text-xl">,90</span>
                  <span className="text-text-secondary">/mês</span>
                </div>
                <p className="text-text-secondary">Acesso completo a todos os módulos</p>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {included.map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-text-primary text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02]"
              >
                Começar teste grátis
                <ArrowRight className="w-5 h-5" />
              </Link>

              <p className="text-center text-text-secondary/60 text-sm mt-4">
                Sem cartão de crédito • Cancele quando quiser
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 mt-8 text-text-secondary">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">Dados seguros</span>
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              <span className="text-sm">Suporte rápido</span>
            </span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-purple-500/10" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
                Pronto para profissionalizar seu estúdio?
              </h2>
              <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto">
                Comece agora e veja como é fácil ter o controle total do seu negócio.
                Seus clientes vão notar a diferença.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-lg transition-all shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105"
              >
                Criar minha conta grátis
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-text-primary">TattooTrack</span>
          </div>
          <p className="text-text-secondary text-sm">
            &copy; {new Date().getFullYear()} TattooTrack. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
