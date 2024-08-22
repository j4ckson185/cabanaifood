const API_BASE_URL = 'https://us-central1-cabana-ifood.cloudfunctions.net';

async function fazerRequisicaoAPI(endpoint, metodo = 'GET', corpo = null) {
    try {
        const opcoes = {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (corpo) {
            opcoes.body = JSON.stringify(corpo);
        }

        console.log(`Fazendo requisição para ${API_BASE_URL}/proxyRequest${endpoint}`, opcoes);
        const resposta = await fetch(`${API_BASE_URL}/proxyRequest${endpoint}`, opcoes);
        
        const texto = await resposta.text();
        console.log(`Resposta da API (${resposta.status}):`, texto);

        if (!resposta.ok) {
            throw new Error(`Erro na API: ${resposta.status} ${resposta.statusText}\nResposta: ${texto}`);
        }

        return texto ? JSON.parse(texto) : null;
    } catch (error) {
        console.error(`Erro ao fazer requisição para ${endpoint}:`, error);
        throw error;
    }
}

export async function polling() {
    return fazerRequisicaoAPI('/events/v1.0/events:polling');
}

export async function acknowledgeEventos(eventIds) {
    return fazerRequisicaoAPI('/events/v1.0/events/acknowledgment', 'POST', eventIds);
}

export async function obterDetalhesPedido(orderId) {
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}`);
}

export async function confirmarPedido(orderId) {
  const resultado = await fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/confirm`, 'POST');
  console.log('Resposta da confirmação:', resultado);
  return { fullCode: resultado.status || 'CONFIRMED', ...resultado };
}

export async function despacharPedido(orderId) {
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/dispatch`, 'POST');
}

export async function obterMotivoCancelamento(orderId) {
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/cancellationReasons`);
}

export async function cancelarPedido(orderId, cancelCodeId, reason) {
  const resultado = await fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/requestCancellation`, 'POST', {
    cancellationCode: cancelCodeId,
    reason: reason
  });
  return { fullCode: 'CANCELLED', ...resultado };
}
