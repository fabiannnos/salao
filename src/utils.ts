// Formatting Helpers

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatCNPJ(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length <= 2) {
    return clean;
  }
  if (clean.length <= 5) {
    return clean.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
  }
  if (clean.length <= 8) {
    return clean.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
  }
  if (clean.length <= 12) {
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
  }
  return clean.substring(0, 14).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
}

export function formatCEP(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length <= 5) {
    return clean;
  }
  return `${clean.substring(0, 5)}-${clean.substring(5, 8)}`;
}

export function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length > 11) return value;
  if (clean.length > 10) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (clean.length > 6) {
    return clean.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
  }
  if (clean.length > 2) {
    return clean.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
  }
  return clean;
}

export function generateWhatsAppLink(phone: string, clientName: string, ticketNumber: string, services: string, total: number, isFiado: boolean, salonName: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const message = `Olá, *${clientName}*! Tudo bem? %0A%0AAqui é do *${salonName}*. Segue o comprovante da sua comanda de serviço *${ticketNumber}*:%0A%0AServiços realizados:%0A${services}%0A%0A*Total Geral: ${formatCurrency(total)}*%0A${isFiado ? '_Lançado no caderno para pagamento ao final do mês._' : '_Pago com sucesso! Obrigado pela preferência!_'}`;
  return `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${message}`;
}

export function getMonthName(monthIndex: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[monthIndex] || '';
}

export function getComissaoReferenceDate(
  comanda: { dateCreated?: string; competenceDate?: string; paymentDate?: string },
  rule: 'competencia' | 'caixa'
): string {
  if (rule === 'caixa') {
    return comanda.paymentDate || '';
  }
  return comanda.competenceDate || (comanda.dateCreated || '').split('T')[0];
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row)
      .map(val => (typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val))
      .join(',')
  );
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
