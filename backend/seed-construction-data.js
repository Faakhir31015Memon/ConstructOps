import connectDB from './src/config/db.js';
import Project from './src/models/project.model.js';
import Material from './src/models/material.model.js';
import Expense from './src/models/expense.model.js';
import User from './src/models/user.model.js';

async function seed() {
  await connectDB();
  console.log('Connected to DB');

  const projects = await Project.find({});
  const owner = await User.findOne({ role: 'owner' });
  const contractor = await User.findOne({ role: 'contractor' });

  if (!owner) {
    console.error('No owner found');
    process.exit(1);
  }

  // Comprehensive Construction Materials
  const standardMaterials = [
    { name: 'Portland Cement (Grade 43/53)', unit: 'bags', totalIn: 1000, totalUsed: 420, remaining: 580 },
    { name: 'Deformed Steel Rebar (60 Grade)', unit: 'ton', totalIn: 25, totalUsed: 12, remaining: 13 },
    { name: 'Red Clay Bricks (Class A)', unit: 'pieces', totalIn: 50000, totalUsed: 28000, remaining: 22000 },
    { name: 'Crushed Stone Aggregate (Bajri)', unit: 'ton', totalIn: 80, totalUsed: 45, remaining: 35 },
    { name: 'Coarse River Sand (Ravi/Chenab)', unit: 'ton', totalIn: 120, totalUsed: 65, remaining: 55 },
    { name: 'Concrete Hollow Blocks (8x8x16)', unit: 'pieces', totalIn: 8000, totalUsed: 3500, remaining: 4500 },
    { name: 'Binding Wire (18 Gauge)', unit: 'kg', totalIn: 250, totalUsed: 140, remaining: 110 },
    { name: 'Crush / Gravel (3/4 inch)', unit: 'ton', totalIn: 60, totalUsed: 30, remaining: 30 },
    { name: 'PVC Electrical Conduits (1 inch)', unit: 'pieces', totalIn: 600, totalUsed: 280, remaining: 320 },
    { name: 'PPRC Water Supply Pipes (25mm)', unit: 'pieces', totalIn: 300, totalUsed: 120, remaining: 180 },
    { name: 'Ceramic Floor Tiles (60x60 cm)', unit: 'pieces', totalIn: 1500, totalUsed: 400, remaining: 1100 },
    { name: 'Chemical Waterproofing (Dr. Fixit)', unit: 'kg', totalIn: 150, totalUsed: 60, remaining: 90 },
    { name: 'Shuttering Plywood Sheets', unit: 'pieces', totalIn: 200, totalUsed: 180, remaining: 20 },
    { name: 'Scaffolding Metal Pipes', unit: 'pieces', totalIn: 350, totalUsed: 300, remaining: 50 },
    { name: 'Structural Steel I-Beams', unit: 'ton', totalIn: 15, totalUsed: 6, remaining: 9 },
  ];

  // Comprehensive Construction Expense Categories & Real Ledger Bills
  const standardExpenses = [
    {
      category: 'material',
      amount: 1450000,
      description: 'Bulk purchase of 1000 bags Portland Cement from Lucky Cement supplier',
      status: 'approved',
      roleAdded: 'owner',
    },
    {
      category: 'material',
      amount: 3250000,
      description: 'Procured 15 Tons Mughal Supreme 60-Grade Deformed Rebar',
      status: 'approved',
      roleAdded: 'contractor',
    },
    {
      category: 'material',
      amount: 650000,
      description: 'Supply of 50,000 First-Class Red Bricks from Bhatta',
      status: 'approved',
      roleAdded: 'contractor',
    },
    {
      category: 'material',
      amount: 420000,
      description: 'Aggregate (Bajri 3/4) 80 tons delivered on site',
      status: 'approved',
      roleAdded: 'contractor',
    },
    {
      category: 'material',
      amount: 380000,
      description: 'Coarse sand 120 tons delivered for concrete mixing and masonry work',
      status: 'approved',
      roleAdded: 'contractor',
    },
    {
      category: 'labor',
      amount: 285000,
      description: 'Weekly skilled mason and steel-fixer gang labor wages',
      status: 'approved',
      roleAdded: 'owner',
    },
    {
      category: 'labor',
      amount: 165000,
      description: 'Excavation labor and foundation trench diggers daily wage disbursement',
      status: 'approved',
      roleAdded: 'contractor',
    },
    {
      category: 'labor',
      amount: 220000,
      description: 'Concrete slab pouring overtime crew wages & shuttering team charges',
      status: 'pending',
      roleAdded: 'contractor',
    },
    {
      category: 'labor',
      amount: 180000,
      description: 'Plumbing and sanitary installation labor billing (Phase 1 rough-in)',
      status: 'pending',
      roleAdded: 'contractor',
    },
    {
      category: 'transport',
      amount: 95000,
      description: 'Freight charge for transit mixer and heavy concrete pump machinery delivery',
      status: 'approved',
      roleAdded: 'owner',
    },
    {
      category: 'transport',
      amount: 65000,
      description: 'Dumper transportation carriage for excavated soil dumping off-site',
      status: 'approved',
      roleAdded: 'contractor',
    },
    {
      category: 'transport',
      amount: 45000,
      description: 'Local Mazada truck delivery for tiles and chemical waterproofing buckets',
      status: 'pending',
      roleAdded: 'contractor',
    },
    {
      category: 'misc',
      amount: 55000,
      description: 'Municipal water tanker supply (6 tankers) for curing concrete slab',
      status: 'approved',
      roleAdded: 'contractor',
    },
    {
      category: 'misc',
      amount: 75000,
      description: 'Rental generator diesel fuel and backup site lighting during night pour',
      status: 'approved',
      roleAdded: 'owner',
    },
    {
      category: 'misc',
      amount: 40000,
      description: 'Safety gear equipment: helmets, high-vis vests, rubber boots, and harness kit',
      status: 'pending',
      roleAdded: 'contractor',
    },
    {
      category: 'misc',
      amount: 120000,
      description: 'Soil bearing test lab report & concrete cube compressive strength test fees',
      status: 'approved',
      roleAdded: 'owner',
    },
  ];

  for (const proj of projects) {
    console.log(`\n--- Seeding Project: ${proj.name} (${proj._id}) ---`);

    // 1. Seed Materials
    for (const m of standardMaterials) {
      const existing = await Material.findOne({ projectId: proj._id, name: m.name });
      if (!existing) {
        await Material.create({
          projectId: proj._id,
          name: m.name,
          unit: m.unit,
          totalIn: m.totalIn,
          totalUsed: m.totalUsed,
          remaining: m.remaining,
        });
        console.log(`  + Material added: ${m.name}`);
      } else {
        console.log(`  = Material already exists: ${m.name}`);
      }
    }

    // 2. Seed Expenses
    for (const exp of standardExpenses) {
      const existingExp = await Expense.findOne({
        projectId: proj._id,
        description: exp.description,
      });

      if (!existingExp) {
        const addedByUser = exp.roleAdded === 'contractor' && contractor ? contractor : owner;
        await Expense.create({
          companyId: proj.companyId || owner.companyId,
          projectId: proj._id,
          category: exp.category,
          amount: exp.amount,
          description: exp.description,
          status: exp.status,
          addedBy: addedByUser._id,
          reviewedBy: exp.status === 'approved' ? owner._id : null,
          reviewedAt: exp.status === 'approved' ? new Date() : null,
          date: new Date(Date.now() - Math.floor(Math.random() * 15 * 86400000)),
        });
        console.log(`  + Expense added [${exp.status.toUpperCase()}]: ${exp.description.substring(0, 40)}... (Rs ${exp.amount})`);
      }
    }

    // Recalculate and update approved spent
    const allApproved = await Expense.find({ projectId: proj._id, status: 'approved' });
    const totalApproved = allApproved.reduce((sum, e) => sum + e.amount, 0);
    proj.spent = totalApproved;
    await proj.save();
    console.log(`  -> Project spent updated to Rs ${totalApproved.toLocaleString()}`);
  }

  console.log('\nAll material stocks and expense ledgers successfully seeded!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
