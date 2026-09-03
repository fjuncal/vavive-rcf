export const fallbackFranchisees = [
  {
    id: "f1",
    name: "João Silva",
    unitName: "VAVIVÊ Barra",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80",
    moment: "INAUGURADA",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    contacts: [
      { id: "c1", franchiseeId: "f1", userId: "u1", type: "TELEFONE", contactedAt: new Date(), notes: "Acompanhamento mensal", createdAt: new Date(), updatedAt: new Date(), user: { name: "Maria" } },
      { id: "c2", franchiseeId: "f1", userId: "u1", type: "PRESENCIAL", contactedAt: new Date(Date.now() - 86400000), notes: "Visita de rotina", createdAt: new Date(), updatedAt: new Date(), user: { name: "Maria" } },
      { id: "c3", franchiseeId: "f1", userId: "u1", type: "WHATSAPP", contactedAt: new Date(Date.now() - 172800000), notes: "Mensagem entregue", createdAt: new Date(), updatedAt: new Date(), user: { name: "Maria" } },
    ],
  },
  {
    id: "f2",
    name: "Maria Souza",
    unitName: "VAVIVÊ Recreio",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80",
    moment: "IMPLANTACAO",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    contacts: [
      { id: "c4", franchiseeId: "f2", userId: "u1", type: "VIDEO_CHAMADA", contactedAt: new Date(Date.now() - 3600000), notes: "Reunião inicial", createdAt: new Date(), updatedAt: new Date(), user: { name: "João" } },
    ],
  },
  {
    id: "f3",
    name: "Carlos Mendes",
    unitName: "VAVIVÊ Niterói",
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80",
    moment: "INAUGURADA",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    contacts: [
      { id: "c5", franchiseeId: "f3", userId: "u1", type: "PRESENCIAL", contactedAt: new Date(Date.now() - 940000000), notes: "Visita ao ponto", createdAt: new Date(), updatedAt: new Date(), user: { name: "João" } },
    ],
  },
];

export const fallbackDashboard = {
  franchiseesCount: 10,
  contactsCount: 48,
  qualifiedCount: 26,
  contactedFranchisees: 8,
  chartData: [
    { name: "WhatsApp", value: 18 },
    { name: "Telefone", value: 12 },
    { name: "Vídeo", value: 8 },
    { name: "Presencial", value: 6 },
  ],
};
