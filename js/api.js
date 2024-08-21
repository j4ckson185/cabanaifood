const API_BASE_URL = 'https://us-central1-cabana-ifood.cloudfunctions.net';

let accessToken = null;
let tokenExpirationTime = 0;

const CLIENT_ID = 'e6415912-782e-4bd9-b6ea-af48c81ae323';
const CLIENT_SECRET = '137o75y57ug8fm55ubfoxlwjpl0xm25jxj18ne5mser23mbprj5nfncvfnr82utnzx73ij4h449o298370rjwpycppazsfyh2s0l';

async function obterTokenAutenticacao() {
    try {
        if (accessToken && Date.now() < tokenExpirationTime) {
            return accessToken;
        }

        console.log('Obtendo novo token de autenticação...');
        const response = await fetch(`${API_BASE_URL}/authentication/v1.0/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'grantType': 'client_credentials',
                'clientId': CLIENT_ID,
                'clientSecret': CLIENT_SECRET,
            }),
        });

        if (!response.ok) {
            throw new Error(`Falha na autenticação: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        accessToken = data.accessToken;
        tokenExpirationTime = Date.now() + (data.expiresIn * 1000) - 60000; // Expira 1 minuto antes para segurança
        console.log('Novo token obtido com sucesso');
        return accessToken;
    } catch (error) {
        console.error('Erro ao obter token:', error);
        throw error;
    }
}

async function fazerRequisicaoAPI(endpoint, metodo = 'GET', corpo = null) {
    try {
        const token = await obterTokenAutenticacao();
        const opcoes = {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        };

        if (corpo) {
            opcoes.body = JSON.stringify(corpo);
        }

        console.log(`Fazendo requisição para ${API_BASE_URL}${endpoint}`, opcoes);
        const resposta = await fetch(`${API_BASE_URL}${endpoint}`, opcoes);
        
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
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/confirm`, 'POST');
}

export async function despacharPedido(orderId) {
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/dispatch`, 'POST');
}

export async function obterMotivoCancelamento(orderId) {
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/cancellationReasons`);
}

export async function cancelarPedido(orderId, cancelCodeId) {
    console.log(`Tentando cancelar pedido ${orderId} com motivo: ${cancelCodeId}`);
    return fazerRequisicaoAPI(`/order/v1.0/orders/${orderId}/requestCancellation`, 'POST', { cancellationCode: cancelCodeId });
}
