-- CreateIndex
CREATE INDEX "Accident_driverId_idx" ON "Accident"("driverId");

-- CreateIndex
CREATE INDEX "Accident_date_idx" ON "Accident"("date");

-- CreateIndex
CREATE INDEX "Assignment_driverId_idx" ON "Assignment"("driverId");

-- CreateIndex
CREATE INDEX "Assignment_truckId_idx" ON "Assignment"("truckId");

-- CreateIndex
CREATE INDEX "Assignment_trailerId_idx" ON "Assignment"("trailerId");

-- CreateIndex
CREATE INDEX "Assignment_isActive_idx" ON "Assignment"("isActive");

-- CreateIndex
CREATE INDEX "CargoClaim_driverId_idx" ON "CargoClaim"("driverId");

-- CreateIndex
CREATE INDEX "CargoClaim_date_idx" ON "CargoClaim"("date");

-- CreateIndex
CREATE INDEX "Document_entityType_entityId_idx" ON "Document"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_expiryDate_idx" ON "Document"("expiryDate");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_truckId_idx" ON "Expense"("truckId");

-- CreateIndex
CREATE INDEX "Expense_trailerId_idx" ON "Expense"("trailerId");

-- CreateIndex
CREATE INDEX "Inspection_date_idx" ON "Inspection"("date");

-- CreateIndex
CREATE INDEX "Inspection_driverId_idx" ON "Inspection"("driverId");

-- CreateIndex
CREATE INDEX "Inspection_truckId_idx" ON "Inspection"("truckId");

-- CreateIndex
CREATE INDEX "Insurance_driverId_idx" ON "Insurance"("driverId");

-- CreateIndex
CREATE INDEX "Insurance_truckId_idx" ON "Insurance"("truckId");

-- CreateIndex
CREATE INDEX "Insurance_status_idx" ON "Insurance"("status");

-- CreateIndex
CREATE INDEX "Notification_type_entityId_idx" ON "Notification"("type", "entityId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Service_serviceDate_idx" ON "Service"("serviceDate");

-- CreateIndex
CREATE INDEX "Service_truckId_idx" ON "Service"("truckId");

-- CreateIndex
CREATE INDEX "Service_trailerId_idx" ON "Service"("trailerId");

-- CreateIndex
CREATE INDEX "Service_status_idx" ON "Service"("status");
