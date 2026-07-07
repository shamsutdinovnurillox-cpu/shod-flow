import "dotenv/config";
import { Role, Department } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

// Sana yordamchilari
const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000);
const yearsAgo = (y: number) => new Date(Date.now() - y * 365 * 86400000);

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // ---- Foydalanuvchilar ----
  await prisma.user.upsert({
    where: { email: "admin@shodflow.com" },
    update: {},
    create: { email: "admin@shodflow.com", name: "System Admin", passwordHash, role: Role.ADMIN, department: Department.ADMIN },
  });
  await prisma.user.upsert({
    where: { email: "fleet@shodflow.com" },
    update: {},
    create: { email: "fleet@shodflow.com", name: "Fleet Manager", passwordHash, role: Role.FLEET_USER, department: Department.FLEET },
  });
  await prisma.user.upsert({
    where: { email: "safety@shodflow.com" },
    update: {},
    create: { email: "safety@shodflow.com", name: "Safety Manager", passwordHash, role: Role.SAFETY_USER, department: Department.SAFETY },
  });

  // ---- Namuna operatsion ma'lumot (faqat bo'sh bazada) ----
  if ((await prisma.truck.count()) > 0) {
    console.log("Users tayyor. Namuna ma'lumot allaqachon mavjud — o'tkazib yuborildi.");
    return;
  }

  const truck1 = await prisma.truck.create({
    data: { unitNumber: "T-101", vin: "1FUJGLDR5CLBP1234", licensePlate: "AA1001", make: "Freightliner", year: 2021, ownershipType: "COMPANY", location: "Chicago Yard", status: "ASSIGNED", motiveGateway: "MG-1001", camera: "CAM-1001", eldPt30: "ELD-1001" },
  });
  const truck2 = await prisma.truck.create({
    data: { unitNumber: "T-102", vin: "3AKJGLDV8FSFJ5678", licensePlate: "AA1002", make: "Volvo", year: 2020, ownershipType: "LEASED", location: "Dallas Yard", status: "UNASSIGNED" },
  });
  const truck3 = await prisma.truck.create({
    data: { unitNumber: "T-103", vin: "1XKYD49X9MJ333999", licensePlate: "AA1003", make: "Kenworth", year: 2022, ownershipType: "OWNER_OPERATOR", location: "Service Shop", status: "IN_SERVICE" },
  });

  const trailer1 = await prisma.trailer.create({
    data: { trailerNumber: "TR-501", vin: "1GRAA0622BJ501111", year: 2019, make: "Wabash", licensePlate: "BB5001", state: "IL", location: "Chicago Yard", pickupDate: yearsAgo(1), annualInspectionDate: daysFromNow(120), status: "LOADED" },
  });
  await prisma.trailer.create({
    data: { trailerNumber: "TR-502", vin: "1GRAA0622BJ502222", year: 2018, make: "Great Dane", licensePlate: "BB5002", state: "TX", location: "Dallas Yard", pickupDate: yearsAgo(2), annualInspectionDate: daysFromNow(20), status: "UNASSIGNED" },
  });

  // Haydovchilar — biri CDL'i tez orada tugaydi (safety alert uchun)
  const driver1 = await prisma.driver.create({
    data: { firstName: "John", lastName: "Carter", dob: yearsAgo(41), cdlNumber: "CDL-IL-9001", cdlState: "IL", cdlIssueDate: yearsAgo(4), cdlExpiryDate: daysFromNow(20), medCardExpiryDate: daysFromNow(200), hireDate: yearsAgo(3), status: "ACTIVE" },
  });
  const driver2 = await prisma.driver.create({
    data: { firstName: "Miguel", lastName: "Santos", dob: yearsAgo(35), cdlNumber: "CDL-TX-9002", cdlState: "TX", cdlIssueDate: yearsAgo(2), cdlExpiryDate: daysFromNow(400), medCardExpiryDate: daysFromNow(15), hireDate: yearsAgo(1), status: "ACTIVE" },
  });

  // T-101 ASSIGNED — faol biriktiruv (profil haydovchini ko'rsatishi uchun)
  await prisma.assignment.create({
    data: { truckId: truck1.id, driverId: driver1.id, pickupDate: yearsAgo(1), isActive: true },
  });

  await prisma.service.create({
    data: { entityType: "TRUCK", truckId: truck3.id, serviceDate: daysFromNow(-2), serviceType: "Brake replacement", status: "IN_PROGRESS", shop: "Midwest Diesel", mechanic: "Ray", cost: 1250.0, odometer: 480000, description: "Front brakes + rotors" },
  });
  await prisma.expense.create({
    data: { entityType: "TRUCK", truckId: truck1.id, date: daysFromNow(-5), category: "PARTS", vendor: "NAPA", amount: 320.5, paymentStatus: "PAID", paymentMethod: "Card" },
  });
  await prisma.expense.create({
    data: { entityType: "FLEET", date: daysFromNow(-3), category: "PARKING", vendor: "TA Travel Center", amount: 90.0, paymentStatus: "PENDING" },
  });

  await prisma.insurance.create({
    data: { type: "OCC_ACC", driverId: driver1.id, status: "ACTIVE", expiryDate: daysFromNow(300) },
  });
  await prisma.insurance.create({
    data: { type: "PD_BOBTAIL", truckId: truck1.id, status: "ACTIVE", expiryDate: daysFromNow(25) },
  });

  await prisma.accident.create({
    data: { driverId: driver2.id, truckId: truck1.id, date: daysFromNow(-10), location: "I-35 near Dallas, TX", fault: "NOT_AT_FAULT", postAccidentTestDone: false, status: "PENDING", notes: "Minor rear-end, no injuries." },
  });
  await prisma.cargoClaim.create({
    data: { driverId: driver1.id, truckId: truck1.id, date: daysFromNow(-7), location: "Chicago, IL", loadNumber: "LD-88213", broker: "TQL", claimNumber: "CLM-2024-1", status: "PENDING", notes: "Damaged pallets on delivery." },
  });
  await prisma.inspection.create({
    data: { driverId: driver1.id, truckId: truck1.id, date: daysFromNow(-1), state: "IN", level: 2, status: "PENDING_REVIEW", violations: "Tire tread depth warning." },
  });

  await prisma.notification.create({
    data: { type: "EXPIRING_DOC", priority: "HIGH", entityType: "DRIVER", entityId: driver1.id, message: "CDL 20 kun ichida tugaydi (John Carter).", status: "OPEN", dueDate: daysFromNow(20) },
  });

  console.log("Seed tayyor: 3 user, 3 truck, 2 trailer, 2 driver + namuna yozuvlar.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
