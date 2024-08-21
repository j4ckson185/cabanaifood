const API_BASE_URL = 'https://us-central1-cabana-ifood.cloudfunctions.net';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

async function fazerRequisicaoAPI(endpoint, metodo = 'GET', corpo = null, tentativa = 0) {
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

        console.log(`Tentativa ${tentativa + 1}: Fazendo requisição para ${API_BASE_URL}/proxyRequest${endpoint}`, opcoes);
        const resposta = await fetch(`${API_BASE_URL}/proxyRequest${endpoint}`, opcoes);
        
        const texto = await resposta.text();
        console.log(`Resposta da API (${resposta.status}):`, texto);

        let data;
        try {
            data = JSON.parse(texto);
        } catch (e) {
            console.error('Erro ao fazer parse da resposta:', e);
            data = { error: texto };
        }

        if (!resposta.ok) {
            if (resposta.status === 500 && tentativa < MAX_RETRIES) {
                console.log(`Tentando novamente em ${RETRY_DELAY}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return fazerRequisicaoAPI(endpoint, metodo, corpo, tentativa + 1);
            }
            throw new Error(data.error || `Erro na API: ${resposta.status} ${resposta.statusText}`);
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
