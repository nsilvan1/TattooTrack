import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bug,
  Lightbulb,
  HelpCircle,
  Upload,
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { Modal, Button, Input } from './ui'
import { reportsApi } from '../services/api'
import type { ReportType, ReportPriority } from '../types'

interface ReportBugModalProps {
  isOpen: boolean
  onClose: () => void
}

const REPORT_TYPES: { value: ReportType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'bug', label: 'Bug', icon: <Bug className="w-4 h-4" />, color: '#ef4444' },
  { value: 'feature', label: 'Sugestao', icon: <Lightbulb className="w-4 h-4" />, color: '#eab308' },
  { value: 'other', label: 'Outro', icon: <HelpCircle className="w-4 h-4" />, color: '#6b7280' },
]

const PRIORITY_OPTIONS: { value: ReportPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baixa', color: '#22c55e' },
  { value: 'medium', label: 'Media', color: '#eab308' },
  { value: 'high', label: 'Alta', color: '#f97316' },
  { value: 'critical', label: 'Critica', color: '#ef4444' },
]

export default function ReportBugModal({ isOpen, onClose }: ReportBugModalProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ReportType>('bug')
  const [priority, setPriority] = useState<ReportPriority>('medium')
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setType('bug')
    setPriority('medium')
    setScreenshots([])
    setPreviewUrls([])
    setError(null)
    setShowSuccess(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      let uploadedUrls: string[] = []

      // Upload screenshots first
      if (screenshots.length > 0) {
        setIsUploading(true)
        try {
          const result = await reportsApi.uploadScreenshots(screenshots)
          uploadedUrls = result.urls
        } catch (err) {
          throw new Error('Erro ao fazer upload das imagens')
        } finally {
          setIsUploading(false)
        }
      }

      // Create report
      return reportsApi.create({
        title,
        description,
        type,
        priority,
        screenshots: uploadedUrls,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['my-reports'] })
      setShowSuccess(true)
    },
    onError: (err: any) => {
      setError(err.message || 'Erro ao enviar report')
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + screenshots.length > 5) {
      setError('Maximo de 5 imagens permitidas')
      return
    }

    // Validate file sizes (max 5MB each)
    const invalidFiles = files.filter(f => f.size > 5 * 1024 * 1024)
    if (invalidFiles.length > 0) {
      setError('Cada imagem deve ter no maximo 5MB')
      return
    }

    setError(null)
    setScreenshots(prev => [...prev, ...files])

    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('Titulo e obrigatorio')
      return
    }
    if (!description.trim()) {
      setError('Descricao e obrigatoria')
      return
    }
    createMutation.mutate()
  }

  // Success screen
  if (showSuccess) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size="md">
        <div className="py-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">Report Enviado!</h3>
          <p className="text-text-secondary mb-6">
            Seu report foi enviado com sucesso. Voce recebera uma notificacao quando ele for analisado.
          </p>
          <div className="flex justify-center">
            <Button onClick={handleClose}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reportar Problema" size="lg">
      <div className="space-y-4">
        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Tipo</label>
          <div className="flex gap-2">
            {REPORT_TYPES.map(rt => (
              <button
                key={rt.value}
                onClick={() => setType(rt.value)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  type === rt.value
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
                style={{ color: type === rt.value ? rt.color : undefined }}
              >
                {rt.icon}
                <span className="text-sm">{rt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <Input
          label="Titulo *"
          placeholder="Resuma o problema em poucas palavras"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Descricao *</label>
          <textarea
            className="w-full px-3 py-2 rounded-xl text-sm text-text-primary border border-white/10 placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none bg-white/5"
            rows={4}
            placeholder="Descreva o problema em detalhes. O que voce estava fazendo? O que aconteceu? O que deveria ter acontecido?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Prioridade</label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map(p => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all ${
                  priority === p.value
                    ? 'border-white/30'
                    : 'border-white/10 hover:border-white/20'
                }`}
                style={{
                  backgroundColor: priority === p.value ? `${p.color}20` : undefined,
                  color: priority === p.value ? p.color : undefined,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Screenshots */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Prints de Tela (opcional, max 5)
          </label>

          {/* Preview grid */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group aspect-video rounded-lg overflow-hidden bg-white/5">
                  <img src={url} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeScreenshot(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {screenshots.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/20 hover:border-white/40 transition-colors text-text-secondary hover:text-text-primary"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm">Adicionar imagem</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || isUploading}
          >
            {(createMutation.isPending || isUploading) ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isUploading ? 'Enviando imagens...' : 'Enviando...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Report
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
