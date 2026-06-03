'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Upload, FileSpreadsheet, CheckCircle,
  AlertCircle, AlertTriangle, Loader2, Download, X,
} from 'lucide-react'

type Estado = 'idle' | 'processando' | 'concluido' | 'erro'

interface Resumo {
  total: number
  criticos: number
  atencao: number
  ok: number
  downloadUrl: string
  nomeArquivo: string
}

export default function LotePage() {
  const router   = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [estado, setEstado]     = useState<Estado>('idle')
  const [arquivo, setArquivo]   = useState<File | null>(null)
  const [resumo, setResumo]     = useState<Resumo | null>(null)
  const [erroMsg, setErroMsg]   = useState('')
  const [progresso, setProgresso] = useState(0)

  function handleArquivo(files: FileList | null) {
    if (!files?.length) return
    const f = files[0]
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls') && !f.name.endsWith('.csv')) {
      setErroMsg('Formato inválido. Use .xlsx, .xls ou .csv')
      return
    }
    setArquivo(f)
    setErroMsg('')
    setEstado('idle')
    setResumo(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleArquivo(e.dataTransfer.files)
  }

  async function processar() {
    if (!arquivo) return
    setEstado('processando')
    setProgresso(0)
    setErroMsg('')

    // Simula progresso enquanto aguarda
    const interval = setInterval(() => {
      setProgresso(p => Math.min(p + Math.random() * 8, 90))
    }, 800)

    try {
      const form = new FormData()
      form.append('arquivo', arquivo)

      const res = await fetch('/api/associacoes/lote', { method: 'POST', body: form })

      clearInterval(interval)
      setProgresso(100)

      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.erro ?? 'Erro ao processar')
      }

      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const nome     = `ficha-associacoes-${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.xlsx`

      setResumo({
        total:       Number(res.headers.get('X-Total') ?? 0),
        criticos:    Number(res.headers.get('X-Criticos') ?? 0),
        atencao:     Number(res.headers.get('X-Atencao') ?? 0),
        ok:          Number(res.headers.get('X-Total') ?? 0) - Number(res.headers.get('X-Criticos') ?? 0) - Number(res.headers.get('X-Atencao') ?? 0),
        downloadUrl: url,
        nomeArquivo: nome,
      })
      setEstado('concluido')
    } catch (e: any) {
      clearInterval(interval)
      setEstado('erro')
      setErroMsg(e.message ?? 'Erro ao processar a planilha.')
    }
  }

  function resetar() {
    setArquivo(null)
    setEstado('idle')
    setResumo(null)
    setErroMsg('')
    setProgresso(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-brand-gray-light transition-colors">
          <ArrowLeft className="w-5 h-5 text-brand-gray" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Consulta em Lote</h1>
          <p className="text-brand-gray text-sm">Verifique toda a sua base de associados de uma vez</p>
        </div>
      </div>

      {/* Instrução */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Como preparar sua planilha</p>
          <p>A planilha deve ter uma coluna com o título <strong>CPF</strong> na primeira linha. Os CPFs podem estar com ou sem pontuação. Limite de <strong>500 CPFs</strong> por envio.</p>
        </div>
      </div>

      {/* Upload */}
      {estado !== 'concluido' && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={`card p-10 mb-6 text-center cursor-pointer border-2 border-dashed transition-all ${
            arquivo ? 'border-brand-green bg-brand-green-light/40' : 'border-brand-border hover:border-brand-green/40 hover:bg-brand-off-white'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => handleArquivo(e.target.files)}
          />

          {arquivo ? (
            <div className="flex items-center justify-center gap-4">
              <FileSpreadsheet className="w-10 h-10 text-brand-green" />
              <div className="text-left">
                <p className="font-bold text-brand-dark">{arquivo.name}</p>
                <p className="text-sm text-brand-gray">{(arquivo.size / 1024).toFixed(1)} KB · Pronto para processar</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); resetar() }}
                className="p-2 rounded-lg hover:bg-brand-gray-light ml-2"
              >
                <X className="w-4 h-4 text-brand-gray" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-brand-gray mx-auto mb-3" />
              <p className="font-semibold text-brand-dark mb-1">Arraste a planilha aqui ou clique para selecionar</p>
              <p className="text-sm text-brand-gray">Formatos aceitos: .xlsx, .xls, .csv</p>
            </>
          )}
        </div>
      )}

      {erroMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex gap-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {erroMsg}
        </div>
      )}

      {/* Processando */}
      {estado === 'processando' && (
        <div className="card p-8 mb-6 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-green mx-auto mb-4" />
          <p className="font-bold text-brand-dark mb-2">Consultando associados...</p>
          <p className="text-sm text-brand-gray mb-5">Isso pode levar alguns minutos dependendo da quantidade de CPFs</p>
          <div className="w-full bg-brand-gray-light rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-green h-2 rounded-full transition-all duration-700"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <p className="text-xs text-brand-gray mt-2">{Math.round(progresso)}% concluído</p>
        </div>
      )}

      {/* Resultado */}
      {estado === 'concluido' && resumo && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <CheckCircle className="w-6 h-6 text-brand-green" />
              <div>
                <p className="font-bold text-brand-dark">Consulta concluída</p>
                <p className="text-sm text-brand-gray">{resumo.total} associados verificados</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-black text-red-600">{resumo.criticos}</p>
                <p className="text-xs font-bold text-red-700 mt-1">CRITICO</p>
                <p className="text-xs text-red-600 mt-0.5">Óbito, fraude ou PEP</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-black text-yellow-600">{resumo.atencao}</p>
                <p className="text-xs font-bold text-yellow-700 mt-1">ATENÇÃO</p>
                <p className="text-xs text-yellow-600 mt-0.5">Processos ou protestos</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-black text-green-600">{resumo.ok}</p>
                <p className="text-xs font-bold text-green-700 mt-1">OK</p>
                <p className="text-xs text-green-600 mt-0.5">Sem pendências</p>
              </div>
            </div>

            <a
              href={resumo.downloadUrl}
              download={resumo.nomeArquivo}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              <Download className="w-5 h-5" /> Baixar planilha resultado (.xlsx)
            </a>
          </div>

          <button onClick={resetar} className="w-full py-3 text-sm text-brand-gray hover:text-brand-dark transition-colors">
            Fazer nova consulta
          </button>
        </div>
      )}

      {/* Botão processar */}
      {arquivo && estado === 'idle' && (
        <button onClick={processar} className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2">
          <FileSpreadsheet className="w-5 h-5" /> Processar planilha
        </button>
      )}
    </div>
  )
}
