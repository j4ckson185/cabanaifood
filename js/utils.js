function formatarValor(valor) {
    return typeof valor === 'number' ? `R$ ${valor.toFixed(2)}` : 'N/A';
}

function traduzirStatus(status) {
    const traducoes = {
        'PLACED': 'Recebido',
        'CONFIRMED': 'Confirmado',
        'PREPARATION_STARTED': 'Preparação Iniciada',
        'READY_TO_PICKUP': 'Pronto para Retirada',
        'DISPATCHED': 'Despachado',
        'CONCLUDED': 'Concluído',
        'CANCELLED': 'Cancelado'
    };
    return traducoes[status] || status;
}

function traduzirMetodoPagamento(metodo) {
    const traducoes = {
        'CREDIT': 'Cartão de Crédito',
        'DEBIT': 'Cartão de Débito',
        'MEAL_VOUCHER': 'Vale Refeição',
        'FOOD_VOUCHER': 'Vale Alimentação',
        'DIGITAL_WALLET': 'Carteira Digital',
        'PIX': 'PIX',
        'CASH': 'Dinheiro',
        'ONLINE': 'Pagamento Online'
    };
    return traducoes[metodo] || metodo;
}