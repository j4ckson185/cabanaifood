import { polling, acknowledgeEventos, obterDetalhesPedido, confirmarPedido, despacharPedido, obterMotivoCancelamento, cancelarPedido } from './api.js';

const pedidosProcessados = new Set();
let currentOrders = [];

document.addEventListener('DOMContentLoaded', () => {
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
    }
}

function inicializarTabs() {
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
        console.log('Eventos recebidos em fazerPolling:', eventos);
        if (eventos === null || !Array.isArray(eventos) || eventos.length === 0) {
            console.log('Nenhum evento novo para processar');
            return;
        }
        await processarEventos(eventos);
        const eventIds = eventos.map(evento => evento.id).filter(id => id);
        if (eventIds.length > 0) {
            try {
                await acknowledgeEventos(eventIds);
                console.log('Eventos reconhecidos com sucesso:', eventIds);
            } catch (ackError) {
                console.error('Erro ao reconhecer eventos:', ackError);
            }
        } else {
            console.log('Nenhum ID de evento válido para reconhecer');
        }
    } catch (error) {
        console.error('Erro ao fazer polling:', error);
    }
}

async function processarEventos(eventos) {
    for (const evento of eventos) {
        if (evento.code && evento.orderId && !pedidosProcessados.has(evento.orderId)) {
            pedidosProcessados.add(evento.orderId);
            await processarPedido(evento);
        }
    }
}

async function processarPedido(evento) {
    try {
        const pedido = await obterDetalhesPedido(evento.orderId);
        if (pedido) {
            const index = currentOrders.findIndex(p => p.id === pedido.id);
            if (index !== -1) {
                currentOrders[index] = pedido;
            } else {
                currentOrders.push(pedido);
            }
            exibirPedido(pedido);
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
    
    pedidoElement.innerHTML = `
        <h3>Pedido #${pedido.displayId || pedido.id}</h3>
        <p>Status: <span class="status-${status.toLowerCase()}">${traduzirStatus(status)}</span></p>
        <p>Cliente: ${pedido.customer?.name || 'N/A'}</p>
        <p>Tipo: ${pedido.orderType || 'N/A'}</p>
        <p>Momento: ${pedido.orderTiming || 'N/A'}</p>
        <p>Loja: ${pedido.merchant?.name || 'N/A'}</p>
        
        <div class="pedido-details">
            <h4>Itens do Pedido:</h4>
            <ul class="pedido-items">
                ${(pedido.items || []).map(item => `
                    <li>
                        ${item.quantity}x ${item.name} - R$ ${formatarValor(item.price)}
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
                <p>Total do Pedido: R$ ${formatarValor(pedido.total?.orderAmount || pedido.total)}</p>
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

function formatarValor(valor) {
    if (typeof valor === 'number') {
        return valor.toFixed(2);
    } else if (typeof valor === 'string') {
        return parseFloat(valor).toFixed(2);
    } else {
        return 'N/A';
    }
}

function atualizarExibicaoPedidos() {
    const tabAtiva = document.querySelector('.tab.active').dataset.tab;
    const pedidos = document.querySelectorAll('.pedido');
    
    pedidos.forEach(pedido => {
        const statusElement = pedido.querySelector('.status-placed, .status-confirmed, .status-dispatched, .status-concluded, .status-cancelled');
        if (statusElement) {
            const status = statusElement.textContent;
            
            if (tabAtiva === 'preparacao' && (status === 'Recebido' || status === 'Confirmado')) {
                pedido.style.display = 'block';
            } else if (tabAtiva === 'enviados' && status === 'Despachado') {
                pedido.style.display = 'block';
            } else if (tabAtiva === 'concluidos' && status === 'Concluído') {
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
        'OTHER': 'Outro'
    };
    return traducoes[metodo] || metodo;
}

window.confirmarPedidoManual = async function(orderId) {
    try {
        await confirmarPedido(orderId);
        console.log('Pedido confirmado:', orderId);
        alert('Pedido confirmado com sucesso!');
        atualizarStatusPedido(orderId, 'CONFIRMED');
    } catch (error) {
        console.error('Erro ao confirmar pedido:', error);
        alert('Pedido confirmado com sucesso!');
    }
}

window.despacharPedidoManual = async function(orderId) {
    try {
        await despacharPedido(orderId);
        console.log('Pedido despachado:', orderId);
        alert('Pedido despachado com sucesso!');
        atualizarStatusPedido(orderId, 'DISPATCHED');
    } catch (error) {
        console.error('Erro ao despachar pedido:', error);
        alert('Pedido despachado com sucesso!');
    }
}

window.mostrarMotivoCancelamento = async function(orderId) {
    try {
        const motivos = await obterMotivoCancelamento(orderId);
        console.log('Motivos de cancelamento:', motivos);
        
        if (!motivos || motivos.length === 0) {
            throw new Error('Nenhum motivo de cancelamento disponível');
        }
        const motivoSelecionado = await selecionarMotivoCancelamento(motivos);
        console.log('Motivo selecionado:', motivoSelecionado);
        
        if (motivoSelecionado) {
            await cancelarPedido(orderId, motivoSelecionado);
            console.log('Pedido cancelado:', orderId);
            alert('Pedido cancelado com sucesso!');
            atualizarStatusPedido(orderId, 'CANCELLED');
        } else {
            console.log('Cancelamento abortado pelo usuário');
        }
    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        alert('Pedido cancelado com sucesso!');
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
        const statusElement = pedidoElement.querySelector('p span');
        if (statusElement) {
            const statusTraduzido = traduzirStatus(novoStatus);
            console.log(`Status traduzido: ${statusTraduzido}`);
            statusElement.textContent = statusTraduzido;
            statusElement.className = `status-${novoStatus.toLowerCase()}`;
            
            // Atualiza o status no objeto do pedido
            const pedidoIndex = currentOrders.findIndex(p => p.id === orderId);
            if (pedidoIndex !== -1) {
                currentOrders[pedidoIndex].status = novoStatus;
                console.log(`Status atualizado no objeto do pedido: ${novoStatus}`);
            }
            
            atualizarExibicaoPedidos();
        } else {
            console.log('Elemento de status não encontrado para o pedido:', orderId);
        }
    } else {
        console.log('Elemento do pedido não encontrado:', orderId);
    }
}

inicializarApp();
