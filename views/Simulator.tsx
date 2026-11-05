import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  MapPin, 
  Search, 
  Info, 
  DollarSign, 
  Zap, 
  CheckSquare, 
  Square,
  Trees,
  Wind,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Battery,
  ZapOff,
  CreditCard,
  User,
  Mail,
  Phone,
  CheckCircle2
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { SimulatorData, ViewState } from '../types';

interface SimulatorProps {
  onNavigate: (view: ViewState) => void;
  showNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export const Simulator: React.FC<SimulatorProps> = ({ onNavigate, showNotification }) => {
  // Step State: 1 = Analysis, 2 = Config, 3 = Finalize, 4 = Success
  const [step, setStep] = useState<number>(1);
  
  // Data States
  const [billPeriod, setBillPeriod] = useState<'monthly' | 'bimonthly'>('bimonthly');
  const [billAmount, setBillAmount] = useState<number>(3000);
  const [chartData, setChartData] = useState<SimulatorData[]>([]);
  const [inputType, setInputType] = useState<'manual' | 'pdf'>('manual');
  
  // Step 2 Configuration States
  const [panelType, setPanelType] = useState<'standard' | 'premium'>('standard');
  const [addBattery, setAddBattery] = useState<boolean>(false);
  const [financeType, setFinanceType] = useState<'cash' | 'loan'>('loan');

  // Step 3 Form States
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

  const [appliances, setAppliances] = useState([
      { name: 'Aire Central', sub: 'Alto Impacto', checked: true },
      { name: 'Cargador VE', sub: 'Carga Diaria', checked: true },
      { name: 'Bomba Piscina', sub: 'Pico de Verano', checked: false },
      { name: 'Bomba de Calor', sub: 'Carga de Invierno', checked: false },
  ]);

  // Derived Calculations — Precios reales México 2024/2025
  // Sistema residencial 10 paneles 450W = 4.5 kW ≈ $135,000 MXN instalado
  const systemCostBase = 135000;
  const panelCost = panelType === 'premium' ? 28000 : 0;      // Premium: +$28,000
  const batteryCost = addBattery ? 85000 : 0;                  // Batería ~$85,000
  const totalSystemCost = systemCostBase + panelCost + batteryCost;

  // Calculate monthly equivalent for ROI logic
  const monthlyBill = billPeriod === 'monthly' ? billAmount : billAmount / 2;
  // Ahorro realista: paneles cubren ~65-75% del consumo promedio
  const savingsPercent = panelType === 'premium' ? 0.75 : 0.65;
  const finalMonthlySavings = monthlyBill * savingsPercent;
  
  const loanTerm = 15; // years — plazo típico en México
  const interestRate = 0.1099; // 10.99% — tasa promedio crédito solar MX
  const monthlyLoanPayment = (totalSystemCost * interestRate / 12) / (1 - Math.pow(1 + interestRate / 12, -loanTerm * 12));
  
  const netMonthlyPocket = financeType === 'loan' 
    ? finalMonthlySavings - monthlyLoanPayment 
    : finalMonthlySavings;

  // Chart Data Effect
  useEffect(() => {
    const data: SimulatorData[] = [];
    const yearlySavings = finalMonthlySavings * 12;
    const gridInflation = 1.05; // CFE sube ~5% anual

    let cumulativeSolar = - (financeType === 'cash' ? totalSystemCost : 0);
    let cumulativeGrid = 0;
    let currentGridYearly = monthlyBill * 12;

    for (let year = 0; year <= 25; year++) {
      if (year === 0) {
        data.push({ year, savings: cumulativeSolar, gridCost: 0 });
        continue;
      }

      // Ahorro crece ~3% anual (inflación energética parcial)
      const currentYearSavings = yearlySavings * Math.pow(1.03, year);

      if (financeType === 'loan' && year <= loanTerm) {
          cumulativeSolar += (currentYearSavings - (monthlyLoanPayment * 12));
      } else {
          cumulativeSolar += currentYearSavings;
      }

      cumulativeGrid += currentGridYearly;
      currentGridYearly *= gridInflation;

      data.push({
        year,
        savings: Math.round(cumulativeSolar),
        gridCost: Math.round(cumulativeGrid)
      });
    }
    setChartData(data);
  }, [monthlyBill, panelType, addBattery, financeType, finalMonthlySavings, monthlyLoanPayment, totalSystemCost, loanTerm]);

  const toggleAppliance = (index: number) => {
      const newApps = [...appliances];
      newApps[index].checked = !newApps[index].checked;
      setAppliances(newApps);
  };

  const handleNextStep = () => {
      setStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
      setStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setStep(4); // Success state
      showNotification("¡Solicitud enviada con éxito!", "success");
  };

  const paybackYears = (totalSystemCost / (finalMonthlySavings * 12)).toFixed(1);
  const totalSaved = Math.floor(chartData[25]?.savings || 0).toLocaleString();

  // --- Render Helpers ---

  const StepIndicator = ({ num, label, isActive, isCompleted }: { num: number, label: string, isActive: boolean, isCompleted: boolean }) => (
    <div className={`flex flex-col items-center ${isActive ? 'opacity-100' : 'opacity-40'} transition-opacity duration-300`}>
        <span className={`text-xs font-bold tracking-wider mb-1 ${isActive ? 'text-primary' : 'text-gray-400'}`}>{label}</span>
        <div className={`w-20 h-1 rounded transition-all duration-500 ${isActive ? 'bg-primary shadow-[0_0_10px_#13ec5b]' : isCompleted ? 'bg-primary/50' : 'bg-gray-700'}`}></div>
    </div>
  );

  // --- Content Layouts ---

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-primary/10 bg-background/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Simulador de ROI</h1>
            <p className="text-xs text-gray-400">Paso {step < 4 ? step : 3} de 3: {step === 1 ? 'Análisis' : step === 2 ? 'Configuración' : 'Finalizar'}</p>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <StepIndicator num={1} label="ANÁLISIS" isActive={step === 1} isCompleted={step > 1} />
            <StepIndicator num={2} label="SISTEMA" isActive={step === 2} isCompleted={step > 2} />
            <StepIndicator num={3} label="COTIZACIÓN" isActive={step >= 3} isCompleted={step > 3} />
          </div>

          <div className="flex items-center gap-4">
             <button onClick={() => showNotification("Contactando soporte...", "info")} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Ayuda</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
          
          {/* --- LEFT COLUMN (CONTROLS) --- */}
          <div className="w-full lg:w-5/12 space-y-6">
            
            {step === 1 && (
                <div className="space-y-6 animate-fade-in-up">
                     {/* Step 1: Inputs */}
                    <GlassCard>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-white">Ubicación</h2>
                                <p className="text-sm text-gray-400">Datos meteorológicos locales.</p>
                            </div>
                            <MapPin className="text-primary w-6 h-6" />
                        </div>
                        <div className="relative group mb-4">
                            <Search className="absolute left-4 top-3.5 text-gray-400 group-hover:text-primary transition-colors" size={18} />
                            <input 
                                type="text" 
                                placeholder="Ingresa tu dirección" 
                                className="w-full pl-12 pr-4 py-3 bg-black/20 border border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
                            />
                        </div>
                        <div className="bg-primary/5 rounded-xl p-4 flex items-start gap-3 border border-primary/10">
                            <Info className="text-primary w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-300">Austin, TX: <strong>5.3 horas solares</strong>/día.</p>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-white">Consumo</h2>
                                <p className="text-sm text-gray-400">Factura de luz promedio.</p>
                            </div>
                            <Zap className="text-yellow-400 w-6 h-6" />
                        </div>

                        {/* Period Toggle */}
                        <div className="flex bg-black/20 p-1 rounded-lg mb-6 border border-white/5">
                            <button 
                                onClick={() => setBillPeriod('monthly')}
                                className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${billPeriod === 'monthly' ? 'bg-primary text-background shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                Mensual
                            </button>
                            <button 
                                onClick={() => setBillPeriod('bimonthly')}
                                className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${billPeriod === 'bimonthly' ? 'bg-primary text-background shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                Bimestral
                            </button>
                        </div>

                        <div className="mb-8">
                             <div className="flex justify-between mb-4">
                                <label className="text-sm font-medium text-gray-300">Monto {billPeriod === 'monthly' ? 'Mensual' : 'Bimestral'}</label>
                                <span className="text-2xl font-bold text-primary">${billAmount.toLocaleString()}</span>
                             </div>
                             <input 
                                type="range" min="100" max="30000" step="100" value={billAmount} 
                                onChange={(e) => setBillAmount(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-light"
                             />
                             <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                                <span>$100</span>
                                <span>$30,000+</span>
                             </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                             {[1200, 2500, 5000].map((val, i) => (
                                <button key={i} onClick={() => setBillAmount(val)} className="p-2 bg-black/20 rounded-lg border border-white/5 hover:border-primary/30 text-white font-bold transition-all">${val.toLocaleString()}</button>
                             ))}
                        </div>
                    </GlassCard>

                    <GlassCard>
                         <h2 className="text-lg font-bold text-white mb-4">Dispositivos Clave</h2>
                         <div className="grid grid-cols-1 gap-3">
                            {appliances.map((item, i) => (
                                <div key={i} onClick={() => toggleAppliance(i)} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${item.checked ? 'bg-primary/5 border-primary/40' : 'bg-black/20 border-white/5'}`}>
                                    {item.checked ? <CheckSquare className="text-primary w-5 h-5 mr-3" /> : <Square className="text-gray-500 w-5 h-5 mr-3" />}
                                    <span className="text-sm text-white">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-fade-in-up">
                    {/* Step 2: Config */}
                    <GlassCard>
                        <h2 className="text-lg font-bold text-white mb-4">Tipo de Paneles</h2>
                        <div className="space-y-3">
                            <button 
                                onClick={() => setPanelType('standard')}
                                className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all ${panelType === 'standard' ? 'bg-primary/10 border-primary shadow-[0_0_10px_rgba(19,236,91,0.2)]' : 'bg-black/20 border-white/10 hover:border-white/20'}`}
                            >
                                <div className="text-left">
                                    <div className="font-bold text-white">Helios Standard</div>
                                    <div className="text-xs text-gray-400">450W Monocristalino — $135,000 MXN</div>
                                </div>
                                {panelType === 'standard' && <CheckCircle2 className="text-primary" />}
                            </button>
                            <button 
                                onClick={() => setPanelType('premium')}
                                className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all ${panelType === 'premium' ? 'bg-primary/10 border-primary shadow-[0_0_10px_rgba(19,236,91,0.2)]' : 'bg-black/20 border-white/10 hover:border-white/20'}`}
                            >
                                <div className="text-left">
                                    <div className="font-bold text-white flex items-center gap-2">Helios Premium <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded font-bold">RECOMENDADO</span></div>
                                    <div className="text-xs text-gray-400">550W Alta Eficiencia (+15% Gen) — $163,000 MXN</div>
                                </div>
                                {panelType === 'premium' && <CheckCircle2 className="text-primary" />}
                            </button>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <h2 className="text-lg font-bold text-white mb-4">Almacenamiento</h2>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setAddBattery(false)}
                                className={`flex-1 p-4 rounded-xl border text-center transition-all ${!addBattery ? 'bg-primary/10 border-primary' : 'bg-black/20 border-white/10'}`}
                            >
                                <ZapOff className={`mx-auto mb-2 ${!addBattery ? 'text-primary' : 'text-gray-500'}`} />
                                <div className="text-sm font-bold text-white">Solo Red</div>
                            </button>
                            <button 
                                onClick={() => setAddBattery(true)}
                                className={`flex-1 p-4 rounded-xl border text-center transition-all ${addBattery ? 'bg-primary/10 border-primary' : 'bg-black/20 border-white/10'}`}
                            >
                                <Battery className={`mx-auto mb-2 ${addBattery ? 'text-primary' : 'text-gray-500'}`} />
                                <div className="text-sm font-bold text-white">Con Batería</div>
                            </button>
                        </div>
                        {addBattery && (
                            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200">
                                Incluye batería de litio 10 kWh (~$85,000 MXN). Respaldo durante apagones.
                            </div>
                        )}
                    </GlassCard>

                    <GlassCard>
                        <h2 className="text-lg font-bold text-white mb-4">Financiamiento</h2>
                        <div className="grid grid-cols-2 gap-3">
                             <button 
                                onClick={() => setFinanceType('cash')}
                                className={`p-3 rounded-xl border text-center transition-all ${financeType === 'cash' ? 'bg-primary/10 border-primary' : 'bg-black/20 border-white/10'}`}
                             >
                                <DollarSign className="w-5 h-5 mx-auto mb-1 text-white" />
                                <span className="text-sm text-white">Contado</span>
                             </button>
                             <button 
                                onClick={() => setFinanceType('loan')}
                                className={`p-3 rounded-xl border text-center transition-all ${financeType === 'loan' ? 'bg-primary/10 border-primary' : 'bg-black/20 border-white/10'}`}
                             >
                                <CreditCard className="w-5 h-5 mx-auto mb-1 text-white" />
                                <span className="text-sm text-white">Préstamo Solar</span>
                             </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-fade-in-up">
                    {/* Step 3: Form */}
                    <GlassCard>
                        <h2 className="text-lg font-bold text-white mb-2">Finalizar Solicitud</h2>
                        <p className="text-sm text-gray-400 mb-6">Completa tus datos para recibir la propuesta formal y agendar la visita técnica.</p>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Nombre Completo</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                    <input required type="text" className="w-full pl-12 pr-4 py-3 bg-black/20 border border-gray-700 rounded-xl focus:border-primary outline-none text-white" placeholder="Ej. Juan Pérez" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                    <input required type="email" className="w-full pl-12 pr-4 py-3 bg-black/20 border border-gray-700 rounded-xl focus:border-primary outline-none text-white" placeholder="juan@ejemplo.com" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Teléfono</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                    <input required type="tel" className="w-full pl-12 pr-4 py-3 bg-black/20 border border-gray-700 rounded-xl focus:border-primary outline-none text-white" placeholder="+52 555 000 0000" />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 rounded-xl bg-primary hover:bg-primary-light text-background font-bold text-lg shadow-[0_0_20px_rgba(19,236,91,0.3)] transition-all transform hover:scale-[1.02] mt-4 flex items-center justify-center gap-2">
                                Confirmar y Enviar <CheckCircle2 className="w-5 h-5" />
                            </button>
                        </form>
                    </GlassCard>
                    
                    <div className="text-xs text-center text-gray-500 px-4">
                        Al enviar, aceptas nuestros términos de servicio. Un asesor experto revisará tu configuración antes de la instalación.
                    </div>
                </div>
            )}
            
            {step === 4 && (
                <div className="h-full flex flex-col items-center justify-center animate-fade-in-up">
                    <GlassCard className="text-center p-10 border-primary/30">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">¡Solicitud Recibida!</h2>
                        <p className="text-gray-300 mb-6">Hemos enviado los detalles de tu cotización a tu correo electrónico.</p>
                        <button onClick={() => onNavigate('dashboard')} className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">
                            Volver al Inicio
                        </button>
                    </GlassCard>
                </div>
            )}

            {/* Navigation Buttons */}
            {step < 4 && (
                <div className="flex gap-4 pt-2">
                    {step > 1 ? (
                        <button 
                            onClick={handlePrevStep}
                            className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-300 font-medium hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" /> Atrás
                        </button>
                    ) : (
                        <button 
                            onClick={() => onNavigate('dashboard')}
                            className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-300 font-medium hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" /> Salir
                        </button>
                    )}
                    
                    {step < 3 && (
                        <button 
                            onClick={handleNextStep}
                            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-light text-background font-bold shadow-[0_0_20px_rgba(19,236,91,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {step === 1 ? 'Obtener Cotización' : 'Siguiente Paso'} <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
          </div>

          {/* --- RIGHT COLUMN (RESULTS & SUMMARY) --- */}
          <div className="w-full lg:w-7/12 relative">
             <div className="sticky top-6 space-y-6">
                
                {step < 4 && (
                    <div className="flex justify-between items-end">
                        <div>
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                {step === 3 ? 'Resumen Final' : 'Proyección en Vivo'}
                            </h3>
                            <h2 className="text-3xl font-bold text-white">
                                {step === 1 ? 'Resultados Proyectados' : step === 2 ? 'Impacto del Sistema' : 'Detalle de Costos'}
                            </h2>
                        </div>
                    </div>
                )}

                {/* Step 1 & 2 Charts */}
                {(step === 1 || step === 2) && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <GlassCard className="relative overflow-hidden group border-primary/20 cursor-default" noPadding>
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                    <DollarSign size={80} />
                                </div>
                                <div className="p-6 relative z-10">
                                    <p className="text-gray-400 text-sm font-medium">Ahorro Mensual Estimado</p>
                                    <div className="flex items-baseline mt-2 gap-1">
                                        <span className="text-4xl font-bold text-white">${Math.floor(finalMonthlySavings).toLocaleString()}</span>
                                        <span className="text-sm text-primary font-medium">/mes</span>
                                    </div>
                                    <div className="mt-4 flex items-center text-xs text-primary font-bold bg-primary/10 w-fit px-3 py-1.5 rounded-lg border border-primary/20">
                                        <ArrowRight className="w-3 h-3 mr-2" />
                                        Ahorra ${totalSaved} en 25 años
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="relative overflow-hidden group cursor-default" noPadding>
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Info size={80} />
                                </div>
                                <div className="p-6 relative z-10">
                                    <p className="text-gray-400 text-sm font-medium">Retorno de Inversión</p>
                                    <div className="flex items-baseline mt-2 gap-1">
                                        <span className="text-4xl font-bold text-white">{paybackYears}</span>
                                        <span className="text-sm text-gray-400 font-medium">años</span>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                            <span>Estado</span>
                                            <span className={paybackYears < '7.0' ? 'text-green-400' : 'text-yellow-400'}>{paybackYears < '7.0' ? 'Excelente' : 'Bueno'}</span>
                                        </div>
                                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                            <div className="bg-primary h-full w-[35%] rounded-full shadow-[0_0_10px_rgba(19,236,91,0.5)]"></div>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                        <GlassCard className="h-[350px] flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-white">Flujo de Caja Acumulado</h3>
                            </div>
                            
                            <div className="flex-1 min-h-0 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#13ec5b" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#13ec5b" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="year" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Año ${val}`} minTickGap={30} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#162e1d', borderColor: 'rgba(19,236,91,0.2)', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ahorro Neto']}
                                            labelFormatter={(label) => `Año ${label}`}
                                        />
                                        <Area type="monotone" dataKey="savings" stroke="#13ec5b" strokeWidth={3} fillOpacity={1} fill="url(#colorSavings)" />
                                        <Area type="monotone" dataKey="gridCost" stroke="#4b5563" strokeWidth={2} strokeDasharray="5 5" fill="transparent" name="Costo Red (Sin Solar)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </GlassCard>
                    </>
                )}

                {/* Step 3: Final Quote Summary */}
                {step === 3 && (
                    <GlassCard className="animate-fade-in-up border-primary/20 bg-background/80">
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                <span className="text-gray-400">Sistema 10 paneles 450W (4.5 kW)</span>
                                <span className="font-mono text-white">${systemCostBase.toLocaleString()}</span>
                            </div>
                            
                            {panelType === 'premium' && (
                                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                    <span className="text-gray-400">Upgrade Paneles Premium</span>
                                    <span className="font-mono text-white">+${panelCost.toLocaleString()}</span>
                                </div>
                            )}

                            {addBattery && (
                                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                    <span className="text-gray-400">Batería Powerwall 2</span>
                                    <span className="font-mono text-white">+${batteryCost.toLocaleString()}</span>
                                </div>
                            )}
                            
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-lg font-bold text-white">Costo Total del Sistema</span>
                                <span className="text-2xl font-bold text-primary">${totalSystemCost.toLocaleString()}</span>
                            </div>

                            {financeType === 'loan' && (
                                <div className="bg-primary/5 rounded-lg p-4 border border-primary/10 mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-300">Pago Mensual (15 años @ 10.99%)</span>
                                        <span className="font-bold text-white text-lg">${Math.floor(monthlyLoanPayment).toLocaleString()}/mes</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500">Nuevo pago eléctrico (Solar + Red)</span>
                                        <span className="text-xs font-bold text-green-400">
                                            ${Math.floor(monthlyLoanPayment + (monthlyBill - finalMonthlySavings)).toLocaleString()} vs ${Math.floor(monthlyBill).toLocaleString()} (Mensual)
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                )}

                {/* Eco Stats (Always Visible 1-3) */}
                {step < 4 && (
                    <div className="grid grid-cols-2 gap-4">
                        <GlassCard className="flex flex-col items-center justify-center text-center p-6 bg-green-900/10 hover:bg-green-900/20 transition-colors">
                            <Trees className="text-primary w-8 h-8 mb-2" />
                            <p className="text-2xl font-bold text-white">1,240</p>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Árboles Plantados</p>
                        </GlassCard>
                        <GlassCard className="flex flex-col items-center justify-center text-center p-6 bg-blue-900/10 hover:bg-blue-900/20 transition-colors">
                            <Wind className="text-blue-400 w-8 h-8 mb-2" />
                            <p className="text-2xl font-bold text-white">34 Tons</p>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">CO₂ Compensado</p>
                        </GlassCard>
                    </div>
                )}

             </div>
          </div>

        </div>
      </div>
    </div>
  );
};