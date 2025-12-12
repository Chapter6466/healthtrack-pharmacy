// backend/routes/patients.js

const express = require('express');
const router = express.Router();
const { executeStoredProcedure } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// IMPORTANT: Specific routes BEFORE parameterized routes

// GET /api/patients/insurance/providers - Get all insurance providers
router.get('/insurance/providers', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_GetInsuranceProviders');
        
        res.json({ 
            success: true, 
            providers: result[0] || [] 
        });
    } catch (error) {
        console.error('Get insurance providers error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading insurance providers' 
        });
    }
});

// GET /api/patients/prescribers/list - Get all prescribers
router.get('/prescribers/list', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_GetPrescribers');
        
        res.json({ 
            success: true, 
            prescribers: result[0] || [] 
        });
    } catch (error) {
        console.error('Get prescribers error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading prescribers' 
        });
    }
});

// GET /api/patients/deactivated - Get all deactivated patients (NEW)
router.get('/deactivated', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_GetDeactivatedPatients');
        
        res.json({ 
            success: true, 
            patients: result[0] || [] 
        });
    } catch (error) {
        console.error('Get deactivated patients error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading deactivated patients' 
        });
    }
});

// GET /api/patients - Get all active patients
router.get('/', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_SearchPatients', {
            SearchTerm: null
        });
        
        res.json({ 
            success: true, 
            patients: result[0] || [] 
        });
    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading patients' 
        });
    }
});

// GET /api/patients/:id/history - Get patient purchase history (BEFORE :id route!)
router.get('/:id/history', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await executeStoredProcedure('sp_GetPatientPurchaseHistory', {
            PatientID: parseInt(id)
        });
        
        res.json({ 
            success: true, 
            history: result[0] || [] 
        });
    } catch (error) {
        console.error('Get patient history error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading patient history' 
        });
    }
});

// GET /api/patients/:id/prescriptions - Get patient prescriptions (NEW)
router.get('/:id/prescriptions', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await executeStoredProcedure('sp_GetPatientPrescriptions', {
            PatientID: parseInt(id)
        });
        
        res.json({ 
            success: true, 
            prescriptions: result[0] || [] 
        });
    } catch (error) {
        console.error('Get patient prescriptions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading patient prescriptions' 
        });
    }
});

// GET /api/patients/:id - Get patient details
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await executeStoredProcedure('sp_GetPatientDetails', {
            PatientID: parseInt(id)
        });
        
        res.json({ 
            success: true, 
            patient: result[0] ? result[0][0] : null,
            insurance: result[1] || [],
            prescriptions: result[2] || []
        });
    } catch (error) {
        console.error('Get patient details error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error loading patient details' 
        });
    }
});

// POST /api/patients - Create new patient
router.post('/', requireAuth, async (req, res) => {
    try {
        const { 
            fullName,
            documentId, 
            birthDate,
            gender,
            phone, 
            email, 
            address,
            insuranceProviderId,
            policyNumber,
            insuranceEffectiveFrom,
            insuranceEffectiveTo
        } = req.body;
        
        console.log('Creating patient:', fullName);
        
        const result = await executeStoredProcedure('sp_CreatePatientEnhanced', {
            FullName: fullName,
            DocumentID: documentId,
            BirthDate: birthDate || null,
            Gender: gender || null,
            Phone: phone || null,
            Email: email || null,
            Address: address || null,
            InsuranceProviderID: insuranceProviderId || null,
            PolicyNumber: policyNumber || null,
            InsuranceEffectiveFrom: insuranceEffectiveFrom || null,
            InsuranceEffectiveTo: insuranceEffectiveTo || null
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Patient created:', response.PatientID);
            
            res.json({ 
                success: true, 
                patientId: response.PatientID,
                message: response.Message
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error creating patient' 
            });
        }
    } catch (error) {
        console.error('❌ Create patient error:', error);
        res.status(500).json({ 
            success: false,  
            message: error.message || 'Error creating patient' 
        });
    }
});

// PUT /api/patients/:id - Update patient
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            fullName,
            documentId, 
            birthDate,
            gender,
            phone, 
            email, 
            address
        } = req.body;
        
        console.log('Updating patient:', id);
        
        const result = await executeStoredProcedure('sp_UpdatePatientEnhanced', {
            PatientID: parseInt(id),
            FullName: fullName,
            DocumentID: documentId,
            BirthDate: birthDate || null,
            Gender: gender || null,
            Phone: phone || null,
            Email: email || null,
            Address: address || null
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Patient updated:', response.PatientID);
            
            res.json({ 
                success: true, 
                message: response.Message
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error updating patient' 
            });
        }
    } catch (error) {
        console.error('❌ Update patient error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating patient' 
        });
    }
});

// DELETE /api/patients/:id - Deactivate patient with audit trail (UPDATED)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Se requiere una justificación para desactivar el paciente' 
            });
        }
        
        // FIX: Get user ID from session correctly
        const userId = req.user?.userId || 
                      req.user?.UserID || 
                      req.session?.user?.userId || 
                      req.session?.user?.UserID ||
                      req.session?.userId ||
                      req.session?.UserID;
        
        if (!userId) {
            console.error('❌ No user ID found in session');
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }
        
        console.log('Deactivating patient:', id, 'by user:', userId);
        
        const result = await executeStoredProcedure('sp_DeactivatePatientWithAudit', {
            PatientID: parseInt(id),
            DeactivatedBy: parseInt(userId),  // FIXED: was req.user.userId
            Reason: reason.trim()
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Patient deactivated:', response.PatientID);
            
            res.json({ 
                success: true, 
                message: response.Message
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error deactivating patient' 
            });
        }
    } catch (error) {
        console.error('❌ Deactivate patient error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error deactivating patient' 
        });
    }
});

// POST /api/patients/:id/reactivate - Reactivate a deactivated patient
router.post('/:id/reactivate', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('♻️ Reactivating patient:', id);
        
        // Get user ID from multiple possible locations
        const userId = req.user?.userId || 
                      req.user?.UserID || 
                      req.session?.user?.userId || 
                      req.session?.user?.UserID ||
                      req.session?.userId ||
                      req.session?.UserID;
        
        if (!userId) {
            console.error('❌ No user ID found in session');
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated - please log in again' 
            });
        }
        
        console.log('✅ User ID for reactivation:', userId);
        
        // Call stored procedure with ReactivatedBy parameter
        const result = await executeStoredProcedure('sp_ReactivatePatient', {
            PatientID: parseInt(id),
            ReactivatedBy: parseInt(userId)  // ← ADD THIS LINE
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Patient reactivated:', response.PatientID);
            
            res.json({ 
                success: true, 
                message: response.Message || 'Patient reactivated successfully'
            });
        } else {
            res.json({ 
                success: true, 
                message: 'Patient reactivated successfully'
            });
        }
        
    } catch (error) {
        console.error('❌ Reactivate patient error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error reactivating patient: ' + error.message 
        });
    }
});

// POST /api/patients/:id/insurance - Add insurance
router.post('/:id/insurance', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            insuranceProviderId,
            policyNumber,
            effectiveFrom,
            effectiveTo
        } = req.body;
        
        console.log('Adding insurance to patient:', id);
        
        const result = await executeStoredProcedure('sp_AddPatientInsurance', {
            PatientID: parseInt(id),
            InsuranceProviderID: parseInt(insuranceProviderId),
            PolicyNumber: policyNumber,
            EffectiveFrom: effectiveFrom || null,
            EffectiveTo: effectiveTo || null
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Insurance added:', response.PatientInsuranceID);
            
            res.json({ 
                success: true, 
                insuranceId: response.PatientInsuranceID,
                message: response.Message
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error adding insurance' 
            });
        }
    } catch (error) {
        console.error('❌ Add insurance error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error adding insurance' 
        });
    }
});

// PUT /api/patients/insurance/:id - Update insurance
router.put('/insurance/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            insuranceProviderId,
            policyNumber,
            effectiveFrom,
            effectiveTo
        } = req.body;
        
        console.log('✅ PUT /api/patients/insurance/:id - Updating insurance:', id);
        
        const result = await executeStoredProcedure('sp_UpdatePatientInsurance', {
            PatientInsuranceID: parseInt(id),
            InsuranceProviderID: parseInt(insuranceProviderId),
            PolicyNumber: policyNumber,
            EffectiveFrom: effectiveFrom || null,
            EffectiveTo: effectiveTo || null
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Insurance updated:', response.PatientInsuranceID);
            
            res.json({ 
                success: true, 
                message: response.Message
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error updating insurance' 
            });
        }
    } catch (error) {
        console.error('❌ Update insurance error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating insurance' 
        });
    }
});

// DELETE /api/patients/insurance/:id - Delete insurance
router.delete('/insurance/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('✅ DELETE /api/patients/insurance/:id - Deleting insurance:', id);
        
        const result = await executeStoredProcedure('sp_DeletePatientInsurance', {
            PatientInsuranceID: parseInt(id)
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Insurance deleted:', response.PatientInsuranceID);
            
            res.json({ 
                success: true, 
                message: response.Message
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error deleting insurance' 
            });
        }
    } catch (error) {
        console.error('❌ Delete insurance error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error deleting insurance' 
        });
    }
});

// ========================================
// PRESCRIPTION MANAGEMENT (NEW)
// ========================================

// POST /api/patients/:id/prescriptions - Add prescription
router.post('/:id/prescriptions', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            productId,
            prescriberId,
            prescriptionDate,
            dosage,
            frequency,
            refillsAllowed,
            notes,
            requiredBy
        } = req.body;
        
        // FIX: Get user ID from session correctly
        const userId = req.user?.userId || 
                      req.user?.UserID || 
                      req.session?.user?.userId || 
                      req.session?.user?.UserID ||
                      req.session?.userId ||
                      req.session?.UserID;
        
        if (!userId) {
            console.error('❌ No user ID found in session');
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }
        
        console.log('Adding prescription to patient:', id, 'by user:', userId);
        
        const result = await executeStoredProcedure('sp_AddPatientPrescription', {
            PatientID: parseInt(id),
            ProductID: parseInt(productId),
            PrescriberID: parseInt(prescriberId),
            PrescriptionDate: prescriptionDate,
            Dosage: dosage || null,
            Frequency: frequency || null,
            RefillsAllowed: parseInt(refillsAllowed) || 0,
            Notes: notes || null,
            RequiredBy: requiredBy || null,
            CreatedBy: parseInt(userId)  // ADDED: This was missing!
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Prescription added:', response.NewPrescriptionID);
            
            res.json({ 
                success: true, 
                prescriptionId: response.NewPrescriptionID,
                message: 'Prescription added successfully'
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error adding prescription' 
            });
        }
    } catch (error) {
        console.error('❌ Add prescription error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error adding prescription' 
        });
    }
});

// PUT /api/patients/prescriptions/:id - Update prescription
router.put('/prescriptions/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            dosage,
            frequency,
            refillsAllowed,
            notes,
            requiredBy,
            status
        } = req.body;
        
        console.log('Updating prescription:', id);
        
        const result = await executeStoredProcedure('sp_UpdatePrescription', {
            PrescriptionID: parseInt(id),
            Dosage: dosage || null,
            Frequency: frequency || null,
            RefillsAllowed: refillsAllowed || null,
            Notes: notes || null,
            RequiredBy: requiredBy || null,
            Status: status || null
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Prescription updated:', response.PrescriptionID);
            
            res.json({ 
                success: true, 
                message: response.Message
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error updating prescription' 
            });
        }
    } catch (error) {
        console.error('❌ Update prescription error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error updating prescription' 
        });
    }
});

// POST /api/patients/prescriptions/:id/pickup - Record prescription pickup
router.post('/prescriptions/:id/pickup', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('Recording prescription pickup:', id);
        
        const result = await executeStoredProcedure('sp_RecordPrescriptionPickup', {
            PrescriptionID: parseInt(id),
            PickupDate: new Date().toISOString()
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Prescription pickup recorded:', response.PrescriptionID);
            
            res.json({ 
                success: true, 
                message: response.Message,
                refillsRemaining: response.RefillsRemaining
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error recording pickup' 
            });
        }
    } catch (error) {
        console.error('❌ Record pickup error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error recording pickup' 
        });
    }
});

// DELETE /api/patients/prescriptions/:id - Cancel prescription
router.delete('/prescriptions/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('Canceling prescription:', id);
        
        const result = await executeStoredProcedure('sp_CancelPrescription', {
            PrescriptionID: parseInt(id)
        });
        
        if (result[0] && result[0].length > 0) {
            const response = result[0][0];
            console.log('✅ Prescription canceled:', response.PrescriptionID);
            
            res.json({ 
                success: true, 
                message: response.Message
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Error canceling prescription' 
            });
        }
    } catch (error) {
        console.error('❌ Cancel prescription error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error canceling prescription' 
        });
    }
});

module.exports = router;