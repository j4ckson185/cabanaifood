import { polling, acknowledgeEventos, obterDetalhesPedido, confirmarPedido, despacharPedido, obterMotivoCancelamento, cancelarPedido } from './api.js';

const pedidosProcessados = new Set();
let intervalosAtualizacao = {};
let currentOrders = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando app...');
    inicializarApp();
    inicializarTabs();
});

async function inicializarApp() {
    try {
        console.log('Inicializando aplicativo...');
        await fazerPolling();
        setInterval(fazerPolling, 30000);
    } catch (error) {
        console.error('Erro ao inicializar o app:', error);
        alert('Erro ao inicializar o aplicativo. Por favor, verifique o console e tente novamente.');
    }
}

function inicializarTabs() {
    console.log('Inicializando tabs...');
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            atualizarExibicaoPedidos();
        });
    });
}

async function fazerPolling() {
    try {
        console.log('Iniciando polling...');
        const eventos = await polling();
        if (eventos === null) {
            console.log('Nenhum evento recebido ou erro no polling');
            return;
        }
        console.log('Eventos recebidos em fazerPolling:', eventos);
        if (eventos && Array.isArray(eventos) && eventos.length > 0) {
            await processarEventos(eventos);
            const eventIds = eventos.map(evento => evento.id).filter(id => id);
            if (eventIds.length > 0) {
                try {
                    await acknowledgeEventos(eventIds);
                    console.log('Eventos reconhecidos com sucesso:', eventIds);
                } catch (ackError) {
                    console.error('Erro ao reconhecer eventos:', ackError);
                }
            }
        } else {
            console.log('Nenhum evento novo para processar');
        }
    } catch (error) {
        console.error('Erro ao fazer polling:', error);
    }
}

async function processarEventos(eventos) {
    console.log('Processando eventos:', eventos);
    for (const evento of eventos) {
        if (evento.code && evento.orderId && !pedidosProcessados.has(evento.orderId)) {
            pedidosProcessados.add(evento.orderId);
            await processarPedido(evento);
        }
    }
}

async function processarPedido(evento) {
    try {
        console.log('Processando pedido:', evento);
        const pedido = await obterDetalhesPedido(evento.orderId);
        if (pedido) {
            console.log('Detalhes do pedido obtidos:', pedido);
            const index = currentOrders.findIndex(p => p.id === pedido.id);
            if (index !== -1) {
                currentOrders[index] = pedido;
            } else {
                currentOrders.push(pedido);
            }
            exibirPedido(pedido);
            iniciarAtualizacaoStatusTempoReal(pedido.id);
        } else {
            console.error('Pedido não encontrado:', evento.orderId);
        }
    } catch (error) {
        console.error('Erro ao processar pedido:', error);
    }
}

function exibirPedido(pedido) {
    console.log('Exibindo pedido:', pedido);
    const pedidosContainer = document.getElementById('pedidos-container');
    if (!pedidosContainer) {
        console.error('Container de pedidos não encontrado!');
        return;
    }
    let pedidoElement = document.querySelector(`[data-order-id="${pedido.id}"]`);
    
    if (!pedidoElement) {
        pedidoElement = document.createElement('div');
        pedidoElement.className = 'pedido';
        pedidoElement.setAttribute('data-order-id', pedido.id);
        pedidosContainer.appendChild(pedidoElement);
    }
    
    const status = pedido.status || 'N/A';
    
    const formatarValor = (valor) => {
        if (typeof valor === 'number') {
            return valor.toFixed(2);
        } else if (typeof valor === 'string') {
            return parseFloat(valor).toFixed(2);
        } else if (valor && typeof valor === 'object' && valor.orderAmount) {
            return valor.orderAmount.toFixed(2);
        }
        return 'N/A';
    };

    pedidoElement.innerHTML = `
        <h3>Pedido #${pedido.displayId || pedido.id}</h3>
        <p>Status: <span class="status-${status.toLowerCase()}">${traduzirStatus(status)}</span></p>
        <p>Status iFood: <span class="status-ifood" data-order-id="${pedido.id}">${traduzirStatus(status)}</span></p>
        <p>Cliente: ${pedido.customer?.name || 'N/A'}</p>
        <p>Tipo: ${pedido.orderType || 'N/A'}</p>
        <p>Momento: ${pedido.orderTiming || 'N/A'}</p>
        <p>Loja: ${pedido.merchant?.name || 'N/A'}</p>
        
        <div class="pedido-details">
            <h4>Itens do Pedido:</h4>
            <ul class="pedido-items">
                ${(pedido.items || []).map(item => `
                    <li>
                        ${item.quantity}x ${item.name} - R$ ${formatarValor(item.price * item.quantity)}
                        ${item.subItems ? `
                            <ul>
                                ${item.subItems.map(subItem => `
                                    <li>${subItem.quantity}x ${subItem.name} - R$ ${formatarValor(subItem.price)}</li>
                                `).join('')}
                            </ul>
                        ` : ''}
                    </li>
                `).join('')}
            </ul>
            
            <div class="pedido-total">
                <p>Subtotal: R$ ${formatarValor(pedido.subTotal)}</p>
                <p>Taxa de Entrega: R$ ${formatarValor(pedido.deliveryFee)}</p>
                <p>Total do Pedido: R$ ${formatarValor(pedido.total)}</p>
            </div>
            
            <div class="pedido-payment">
                <h4>Pagamento:</h4>
                <p>Método: ${traduzirMetodoPagamento(pedido.payments?.[0]?.method) || 'N/A'}</p>
                <p>Valor: R$ ${formatarValor(pedido.payments?.[0]?.value)}</p>
            </div>
            
            <div class="pedido-delivery">
                <h4>Entrega:</h4>
                <p>Endereço: ${pedido.delivery?.deliveryAddress?.formattedAddress || 'N/A'}</p>
                <p>Complemento: ${pedido.delivery?.deliveryAddress?.complement || 'N/A'}</p>
            </div>
        </div>
        
        <div class="pedido-actions">
            ${status !== 'DISPATCHED' && status !== 'CONCLUDED' && status !== 'CANCELLED' ? `
                <button class="btn btn-confirm" onclick="confirmarPedidoManual('${pedido.id}')">Confirmar</button>
                <button class="btn btn-dispatch" onclick="despacharPedidoManual('${pedido.id}')">Despachar</button>
            ` : ''}
            ${status !== 'CONCLUDED' && status !== 'CANCELLED' ? `
                <button class="btn btn-cancel" onclick="mostrarMotivoCancelamento('${pedido.id}')">Cancelar</button>
            ` : ''}
        </div>
    `;
    
    atualizarExibicaoPedidos();
}

function atualizarExibicaoPedidos() {
    console.log('Atualizando exibição de pedidos...');
    const tabAtiva = document.querySelector('.tab.active')?.dataset.tab;
    const pedidos = document.querySelectorAll('.pedido');
    
    pedidos.forEach(pedido => {
        const statusElement = pedido.querySelector('.status-ifood');
        if (statusElement) {
            const status = statusElement.textContent;
            
            if (tabAtiva === 'preparacao' && ['Recebido', 'Confirmado', 'Integrado', 'Preparado'].includes(status)) {
                pedido.style.display = 'block';
            } else if (tabAtiva === 'enviados' && ['Despachado', 'Pronto para Retirada', 'Retirado'].includes(status)) {
                pedido.style.display = 'block';
            } else if (tabAtiva === 'concluidos' && ['Concluído', 'Entregue'].includes(status)) {
                pedido.style.display = 'block';
            } else if (tabAtiva === 'cancelados' && status === 'Cancelado') {
                pedido.style.display = 'block';
            } else {
                pedido.style.display = 'none';
            }
        }
    });
}

function traduzirStatus(status) {
    const traducoes = {
        'PLACED': 'Recebido',
        'CONFIRMED': 'Confirmado',
        'DISPATCHED': 'Despachado',
        'CONCLUDED': 'Concluído',
        'CANCELLED': 'Cancelado',
        'INTEGRATED': 'Integrado',
        'PREPARED': 'Preparado',
        'READY_TO_PICKUP': 'Pronto para Retirada',
        'PICKED_UP': 'Retirado',
        'DELIVERED': 'Entregue'
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
        'OTHER': 'Outro'
    };
    return traducoes[metodo] || metodo;
}

window.confirmarPedidoManual = async function(orderId) {
    try {
        console.log('Confirmando pedido:', orderId);
        const resultado = await confirmarPedido(orderId);
        atualizarStatusPedido(orderId, resultado.status || 'CONFIRMED');
        alert('Pedido confirmado com sucesso!');
    } catch (error) {
        console.error('Erro ao confirmar pedido:', error);
        alert('Erro ao confirmar pedido. Por favor, tente novamente.');
    }
}

window.despacharPedidoManual = async function(orderId) {
    try {
        console.log('Despachando pedido:', orderId);
        const resultado = await despacharPedido(orderId);
        atualizarStatusPedido(orderId, resultado.status || 'DISPATCHED');
        alert('Pedido despachado com sucesso!');
    } catch (error) {
        console.error('Erro ao despachar pedido:', error);
        alert('Erro ao despachar pedido. Por favor, tente novamente.');
    }
}

window.mostrarMotivoCancelamento = async function(orderId) {
    try {
        console.log('Obtendo motivos de cancelamento para o pedido:', orderId);
        const motivos = await obterMotivoCancelamento(orderId);
        console.log('Motivos de cancelamento:', motivos);
        
        if (!motivos || motivos.length === 0) {
            throw new Error('Nenhum motivo de cancelamento disponível');
        }
        const motivoSelecionado = await selecionarMotivoCancelamento(motivos);
        console.log('Motivo selecionado:', motivoSelecionado);
        
        if (motivoSelecionado) {
            console.log('Cancelando pedido:', orderId);
            const resultado = await cancelarPedido(orderId, motivoSelecionado);
            atualizarStatusPedido(orderId, resultado.status || 'CANCELLED');
            alert('Pedido cancelado com sucesso!');
        } else {
            alert('Cancelamento abortado pelo usuário.');
        }
    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        alert(`Erro ao cancelar pedido: ${error.message}`);
    }
}

async function selecionarMotivoCancelamento(motivos) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Selecione o motivo do cancelamento</h2>
                <select id="motivoCancelamento">
                    ${motivos.map(motivo => `<option value="${motivo.code}">${motivo.description}</option>`).join('')}
                </select>
                <button id="confirmarCancelamento">Confirmar</button>
                <button id="cancelarCancelamento">Cancelar</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('confirmarCancelamento').addEventListener('click', () => {
            const motivoSelecionado = document.getElementById('motivoCancelamento').value;
            document.body.removeChild(modal);
            resolve(motivoSelecionado);
        });
        document.getElementById('cancelarCancelamento').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(null);
        });
    });
}

function atualizarStatusPedido(orderId, novoStatus) {
    console.log(`Atualizando status do pedido ${orderId} para ${novoStatus}`);
    const pedidoElement = document.querySelector(`[data-order-id="${orderId}"]`);
    if (pedidoElement) {
        const statusElement = pedidoElement.querySelector('p:first-of-type span');
        if (statusElement) {
            statusElement.textContent = traduzirStatus(novoStatus);
            statusElement.className = `status-${novoStatus.toLowerCase()}`;
        }
        const statusIfoodElement = pedidoElement.querySelector('.status-ifood');
        if (statusIfoodElement) {
            statusIfoodElement.textContent = traduzirStatus(novoStatus);
            statusIfoodElement.className = `status-ifood status-${novoStatus.toLowerCase()}`;
        }
        atualizarExibicaoPedidos();
    } else {
        console.error(`Elemento do pedido ${orderId} não encontrado`);
    }
}

function iniciarAtualizacaoStatusTempoReal(orderId) {
    console.log(`Iniciando atualização em tempo real para o pedido ${orderId}`);
    if (intervalosAtualizacao[orderId]) {
        clearInterval(intervalosAtualizacao[orderId]);
    }

    const atualizarStatus = async () => {
        try {
            const pedidoAtualizado = await obterDetalhesPedido(orderId);
            if (pedidoAtualizado && pedidoAtualizado.status) {
                console.log(`Status atualizado do pedido ${orderId}:`, pedidoAtualizado.status);
                atualizarStatusPedido(orderId, pedidoAtualizado.status);
                
                // Se o pedido estiver em um estado final, pare a atualização
                if (['CONCLUDED', 'CANCELLED', 'DELIVERED'].includes(pedidoAtualizado.status)) {
                    console.log(`Parando atualização em tempo real para o pedido ${orderId}`);
                    clearInterval(intervalosAtualizacao[orderId]);
                    delete intervalosAtualizacao[orderId];
                }
            }
        } catch (error) {
            console.error(`Erro ao atualizar status do pedido ${orderId}:`, error);
        }
    };

    // Executa imediatamente e depois a cada 30 segundos
    atualizarStatus();
    intervalosAtualizacao[orderId] = setInterval(atualizarStatus, 30000);
}

// Função para exibir todos os pedidos atuais
function exibirTodosPedidos() {
    console.log('Exibindo todos os pedidos atuais');
    currentOrders.forEach(pedido => {
        exibirPedido(pedido);
    });
}

// Função para limpar todos os pedidos exibidos
function limparPedidosExibidos() {
    console.log('Limpando todos os pedidos exibidos');
    const pedidosContainer = document.getElementById('pedidos-container');
    if (pedidosContainer) {
        pedidosContainer.innerHTML = '';
    }
}

// Adicione esta linha no final do arquivo para iniciar o aplicativo
inicializarApp();

// Adicione estas linhas para debug
console.log('Script carregado');
window.debug = {
    currentOrders,
    exibirTodosPedidos,
    limparPedidosExibidos
};
