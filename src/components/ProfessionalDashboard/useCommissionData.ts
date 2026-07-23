import { useState } from 'react';
import { Comanda, Professional, Salon } from '../../types';
import { getComissaoReferenceDate } from '../../utils';

export function useCommissionData(professional: Professional, comandas: Comanda[], salon?: Salon | null) {
  const [selectedMonth, setSelectedMonth] = useState((new Date()).getMonth());
  const [selectedYear, setSelectedYear] = useState(2026);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);

  const commissionAccrualRule = salon?.commissionAccrualRule ?? 'caixa';

  const professionalServices = comandas
    .filter(c => !c.deletedAt && c.status === 'Concluido')
    .flatMap(c =>
      c.services
        .filter(s => s.professionalId === professional.id)
        .map(s => {
          const refDate = getComissaoReferenceDate(c, commissionAccrualRule);
          if (!refDate) return null;
          const parts = refDate.split('-');
          const refDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          return {
            comandaId: c.id,
            ticketNumber: c.ticketNumber,
            clientName: c.clientName,
            serviceName: s.name,
            serviceId: s.id,
            totalPrice: s.price,
            commissionRate: s.commissionRate,
            commissionValue: s.commissionValue,
            originalCommissionValue: s.originalCommissionValue,
            refDate: refDate,
            refDateObj: refDateObj,
            commissionPaid: s.commissionPaid || false,
            paymentMethod: c.paymentMethod,
            cardAcquirerName: c.cardAcquirerName,
            cardBrand: c.cardBrand,
            cardInstallments: c.cardInstallments,
            cardFeeRateUsed: c.cardFeeRateUsed,
            cardFeeAmount: c.cardFeeAmount,
            profDeductPercentage: c.profDeductPercentage,
            salonDeductPercentage: c.salonDeductPercentage,
            profCardFeeDeduction: c.profCardFeeDeduction,
            salonCardFeeDeduction: c.salonCardFeeDeduction,
            totalValue: c.totalValue,
            paymentDate: c.paymentDate,
            competenceDate: c.competenceDate
          };
        })
    )
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter(item => {
      return item.refDateObj.getMonth() === selectedMonth &&
             item.refDateObj.getFullYear() === selectedYear;
    })
    .filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return item.clientName.toLowerCase().includes(q) ||
             item.ticketNumber.toLowerCase().includes(q) ||
             item.serviceName.toLowerCase().includes(q);
    });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortColumn(null); setSortDirection(null); }
      else setSortDirection('asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortIndicator = (col: string) => {
    if (sortColumn !== col) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const sortedServices = !sortColumn || !sortDirection
    ? [...professionalServices].sort((a, b) => {
        const dateCmp = a.refDate.localeCompare(b.refDate);
        if (dateCmp !== 0) return dateCmp;
        return a.ticketNumber.localeCompare(b.ticketNumber);
      })
    : [...professionalServices].sort((a, b) => {
        const sortVal = (valA: any, valB: any): number => {
          if (typeof valA === 'string' && typeof valB === 'string') {
            const c = valA.toLowerCase().localeCompare(valB.toLowerCase());
            return sortDirection === 'asc' ? c : -c;
          }
          if (typeof valA === 'boolean' && typeof valB === 'boolean') {
            return sortDirection === 'asc' ? (valA ? 1 : -1) : (valA ? -1 : 1);
          }
          const numA = Number(valA) || 0;
          const numB = Number(valB) || 0;
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        };
        return sortVal(a[sortColumn as keyof typeof a], b[sortColumn as keyof typeof b]);
      });

  const totalServiceCount = professionalServices.length;
  const totalFaturamento = professionalServices.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalComissoes = professionalServices.reduce((sum, item) => sum + item.commissionValue, 0);

  const mixMap: { [key: string]: number } = {};
  professionalServices.forEach(item => {
    let cat = 'Outros';
    if (item.serviceName.toLowerCase().includes('corte')) cat = 'Corte';
    else if (item.serviceName.toLowerCase().includes('color')) cat = 'Coloração';
    else if (item.serviceName.toLowerCase().includes('escova') || item.serviceName.toLowerCase().includes('hidra')) cat = 'Hidratação';
    else if (item.serviceName.toLowerCase().includes('unha') || item.serviceName.toLowerCase().includes('manicure')) cat = 'Manicure';
    mixMap[cat] = (mixMap[cat] || 0) + 1;
  });

  const mixArray = Object.entries(mixMap).map(([name, val]) => ({
    name,
    count: val,
    percentage: totalServiceCount > 0 ? Math.round((val / totalServiceCount) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return {
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
    searchQuery, setSearchQuery,
    detailItem, setDetailItem,
    months,
    commissionAccrualRule,
    professionalServices,
    sortedServices,
    totalServiceCount,
    totalFaturamento,
    totalComissoes,
    mixArray,
    handleSort,
    sortIndicator
  };
}
