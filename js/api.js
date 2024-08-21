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

        // Mesmo com status 500, tentamos processar a resposta
        const data = texto ? JSON.parse(texto) : null;

        if (!resposta.ok) {
            // Se a resposta contém um erro do iFood, retornamos os dados
            if (data && data.error) {
                return data;
            }
            throw new Error(`Erro na API: ${resposta.status} ${resposta.statusText}\nResposta: ${texto}`);
        }

        return data;
    } catch (error) {
        console.error(`Erro ao fazer requisição para ${endpoint}:`, error);
        throw error;
    }
}

export async function polling() {
    try {
        const response = await fetch(`${API_BASE_URL}/polling`);
        if (!response.ok) {
            throw new Error(`Erro no polling: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro no polling:', error);
        throw error;
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
