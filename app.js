const rifaDB = new RifaDatabase();
let currentRifa = null;

document.addEventListener('DOMContentLoaded', () => {
  loadRifas();
  
  document.getElementById('rifaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    createRifa();
  });

  document.getElementById('buyTicketBtn').addEventListener('click', buyTickets);

  // Populate raffle draw dropdown
  populateRaffleDrawDropdown();

  // Draw raffle event listener
  document.getElementById('performDrawBtn').addEventListener('click', performRaffleDraw);
  document.getElementById('resetDrawBtn').addEventListener('click', resetRaffleDraw);
});

function createRifa() {
  const name = document.getElementById('rifaName').value;
  const price = document.getElementById('rifaPrice').value;
  const totalTickets = document.getElementById('totalTickets').value;

  if (!name || !price || !totalTickets) {
    alert('Por favor, preencha todos os campos');
    return;
  }

  const rifa = {
    name,
    price: parseFloat(price),
    totalTickets: parseInt(totalTickets),
    soldTickets: [],
    createdAt: new Date()
  };

  rifaDB.addRifa(rifa).then(() => {
    loadRifas();
    document.getElementById('rifaForm').reset();
  });
}

function loadRifas() {
  rifaDB.getAllRifas().then(rifas => {
    const container = document.getElementById('rifasContainer');
    container.innerHTML = '';

    rifas.forEach((rifa, index) => {
      const rifaCard = document.createElement('div');
      rifaCard.className = 'col-md-4';
      rifaCard.innerHTML = `
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">${rifa.name}</h5>
            <p class="card-text">
              Preço do Bilhete: R$ ${rifa.price.toFixed(2)}<br>
              Total de Bilhetes: ${rifa.totalTickets}
            </p>
            <button onclick="openRifaDetails(${index})" class="btn btn-primary">
              Ver Bilhetes
            </button>
          </div>
        </div>
      `;
      container.appendChild(rifaCard);
    });
  });
}

function openRifaDetails(index) {
  rifaDB.getAllRifas().then(rifas => {
    currentRifa = rifas[index];
    
    // Update modal details
    document.getElementById('modalRifaName').textContent = currentRifa.name;
    document.getElementById('modalTicketPrice').textContent = `R$ ${currentRifa.price.toFixed(2)}`;
    document.getElementById('modalTotalTickets').textContent = currentRifa.totalTickets;

    // Generate ticket grid
    const ticketGridModal = document.getElementById('ticketGridModal');
    ticketGridModal.innerHTML = generateTicketGrid(currentRifa);

    // Show modal
    const ticketModal = new bootstrap.Modal(document.getElementById('ticketModal'));
    ticketModal.show();
  });
}

function generateTicketGrid(rifa) {
  let gridHTML = '';
  for (let i = 1; i <= rifa.totalTickets; i++) {
    const isSold = rifa.soldTickets.includes(i);
    gridHTML += `
      <div 
        class="ticket ${isSold ? 'sold' : 'available'}"
        data-ticket-number="${i}"
      >
        ${i}
      </div>
    `;
  }
  return gridHTML;
}

function buyTickets() {
  const selectedTicketsInput = document.getElementById('selectedTicketNumbers');
  const ticketNumbers = selectedTicketsInput.value.split(',')
    .map(num => parseInt(num.trim()))
    .filter(num => !isNaN(num));

  if (!currentRifa) {
    alert('Selecione uma rifa primeiro');
    return;
  }

  // Validate ticket numbers
  const invalidTickets = ticketNumbers.filter(num => 
    num < 1 || num > currentRifa.totalTickets || currentRifa.soldTickets.includes(num)
  );

  if (invalidTickets.length > 0) {
    alert(`Bilhetes inválidos ou já vendidos: ${invalidTickets.join(', ')}`);
    return;
  }

  // Add tickets to sold tickets
  currentRifa.soldTickets.push(...ticketNumbers);

  // Update rifa in database
  rifaDB.updateRifa(currentRifa).then(() => {
    // Generate purchase confirmation with QR code
    showPurchaseConfirmation(ticketNumbers);
    
    // Refresh ticket grid
    const ticketGridModal = document.getElementById('ticketGridModal');
    ticketGridModal.innerHTML = generateTicketGrid(currentRifa);
    
    // Clear input
    selectedTicketsInput.value = '';
  }).catch(error => {
    console.error('Erro ao comprar bilhetes:', error);
    alert('Erro ao comprar bilhetes');
  });
}

function showPurchaseConfirmation(ticketNumbers) {
  const purchaseQRContainer = document.getElementById('purchaseQRCodeContainer');
  const purchaseDetails = document.getElementById('purchaseDetails');

  // Calculate total price
  const totalPrice = ticketNumbers.length * currentRifa.price;

  // Generate QR Code
  const qr = qrcode(0, 'M');
  const purchaseData = JSON.stringify({
    rifaName: currentRifa.name,
    ticketNumbers,
    totalPrice,
    date: new Date().toISOString()
  });
  qr.addData(purchaseData);
  qr.make();
  
  // Clear previous QR code
  purchaseQRContainer.innerHTML = qr.createImgTag(5);

  // Update purchase details
  purchaseDetails.innerHTML = `
    <p><strong>Rifa:</strong> ${currentRifa.name}</p>
    <p><strong>Bilhetes:</strong> ${ticketNumbers.join(', ')}</p>
    <p><strong>Valor Total:</strong> R$ ${totalPrice.toFixed(2)}</p>
  `;

  // Show purchase confirmation modal
  const purchaseConfirmationModal = new bootstrap.Modal(
    document.getElementById('purchaseConfirmationModal')
  );
  purchaseConfirmationModal.show();
}

function populateRaffleDrawDropdown() {
  rifaDB.getAllRifas().then(rifas => {
    const dropdown = document.getElementById('raffleSelectForDraw');
    dropdown.innerHTML = '<option value="">Selecione uma Rifa</option>';
    
    rifas.forEach((rifa, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = rifa.name;
      dropdown.appendChild(option);
    });
  });
}

function performRaffleDraw() {
  const dropdown = document.getElementById('raffleSelectForDraw');
  const selectedIndex = dropdown.value;

  if (selectedIndex === "") {
    alert('Por favor, selecione uma rifa para realizar o sorteio.');
    return;
  }

  rifaDB.getAllRifas().then(rifas => {
    const selectedRifa = rifas[selectedIndex];

    // Check if tickets have been sold
    if (selectedRifa.soldTickets.length === 0) {
      alert('Não há bilhetes vendidos para esta rifa.');
      return;
    }

    // Select a random winning ticket
    const winningTicket = selectedRifa.soldTickets[
      Math.floor(Math.random() * selectedRifa.soldTickets.length)
    ];

    // Update UI with draw results
    const drawResultContent = document.getElementById('drawResultContent');
    const drawRaffleContent = document.getElementById('drawRaffleContent');
    const winnerDetails = document.getElementById('winnerDetails');

    drawRaffleContent.classList.add('d-none');
    drawResultContent.classList.remove('d-none');

    winnerDetails.innerHTML = `
      <p> Rifa: ${selectedRifa.name}</p>
      <p> Bilhete Sorteado: ${winningTicket}</p>
    `;
  });
}

function resetRaffleDraw() {
  const drawResultContent = document.getElementById('drawResultContent');
  const drawRaffleContent = document.getElementById('drawRaffleContent');

  drawResultContent.classList.add('d-none');
  drawRaffleContent.classList.remove('d-none');
}
