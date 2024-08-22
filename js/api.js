const API_BASE_URL = 'https://us-central1-cabana-ifood.cloudfunctions.net/proxyRequest';

async function fazerRequisicaoAPI(endpoint, metodo = 'GET', corpo = null) {
    try {
        console.log(`Fazendo requisição para ${endpoint}`);
        const opcoes = {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        if (corpo) {
            opcoes.body = JSON.stringify(corpo);
        }
        const resposta = await fetch(`${API_BASE_URL}${endpoint}`, opcoes);
        
        const texto = await resposta.text();
        console.log(`Resposta da API (${resposta.status}):`, texto);

        if (!resposta.ok) {
            throw new Error(`Erro na API: ${resposta.status} ${resposta.statusText}\nDetalhes: ${texto}`);
        }

        if (!texto) {
            return null;
        }

        return JSON.parse(texto);
    } catch (error) {
        console.error(`Erro ao fazer requisição para ${endpoint}:`, error);
        throw error;
    }
}

export async function polling() {
    try {
        return await fazerRequisicaoAPI('/events/v1.0/events:polling');
    } catch (error) {
        console.error('Erro no polling:', error);
        return null;
    }
}

export async function acknowledgeEventos(eventIds) {
    return fazerRequisicaoAPI('/events/v1.0/events/acknowledgment', 'POST', eventIds);
}

export async function obterDetalhesPedido(orderId) {
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}`);
}

export async function confirmarPedido(orderId) {
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/confirm`, 'POST');
}

export async function despacharPedido(orderId) {
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/dispatch`, 'POST');
}

export async function obterMotivoCancelamento(orderId) {
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/cancellationReasons`);
}

export async function cancelarPedido(orderId, cancelCodeId) {
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/requestCancellation`, 'POST', { cancellationCode: cancelCodeId });
}
