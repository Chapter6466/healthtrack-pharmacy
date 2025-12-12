// ============================================
// BACKEND: Doctors/Prescribers API Routes
// File: backend/routes/doctors.js
// ============================================

const express = require('express');
const router = express.Router();
const { executeStoredProcedure } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// ============================================
// GET /api/doctors - Get all prescribers
// ============================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const result = await executeStoredProcedure('sp_GetAllPrescribers', {});
        
        if (result[0] && result[0].length > 0) {
            res.json({
                success: true,
                doctors: result[0]
            });
        } else {
            res.json({
                success: true,
                doctors: []
            });
        }
    } catch (error) {
        console.error('❌ Get doctors error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// GET /api/doctors/:id - Get prescriber details
// ============================================
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await executeStoredProcedure('sp_GetPrescriberDetails', {
            PrescriberID: parseInt(id)
        });
        
        if (result[0] && result[0].length > 0) {
            res.json({
                success: true,
                doctor: result[0][0],
                insurance: result[1] || [],
                stats: result[2] && result[2][0] ? result[2][0] : {}
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Prescriber not found'
            });
        }
    } catch (error) {
        console.error('❌ Get prescriber details error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// POST /api/doctors - Add new prescriber
// ============================================
router.post('/', requireAuth, async (req, res) => {
    try {
        const { fullName, licenseNumber, deaNumber, specialty, phone, email } = req.body;
        
        // Validate required fields
        if (!fullName || !licenseNumber || !specialty) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields (fullName, licenseNumber, specialty)'
            });
        }
        
        const result = await executeStoredProcedure('sp_AddPrescriber', {
            FullName: fullName,
            LicenseNumber: licenseNumber,
            DEANumber: deaNumber || null,
            Specialty: specialty,
            Phone: phone || null,
            Email: email || null
        });
        
        if (result[0] && result[0].length > 0) {
            res.status(201).json({
                success: true,
                message: 'Prescriber added successfully',
                doctor: result[0][0]
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to add prescriber'
            });
        }
    } catch (error) {
        console.error('❌ Add prescriber error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// PUT /api/doctors/:id - Update prescriber
// ============================================
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, licenseNumber, deaNumber, specialty, phone, email } = req.body;
        
        // Validate required fields
        if (!fullName || !licenseNumber || !specialty) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        
        const result = await executeStoredProcedure('sp_UpdatePrescriber', {
            PrescriberID: parseInt(id),
            FullName: fullName,
            LicenseNumber: licenseNumber,
            DEANumber: deaNumber || null,
            Specialty: specialty,
            Phone: phone || null,
            Email: email || null
        });
        
        if (result[0] && result[0].length > 0) {
            res.json({
                success: true,
                message: 'Prescriber updated successfully',
                doctor: result[0][0]
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to update prescriber'
            });
        }
    } catch (error) {
        console.error('❌ Update prescriber error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// DELETE /api/doctors/:id - Deactivate prescriber
// ============================================
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await executeStoredProcedure('sp_DeactivatePrescriber', {
            PrescriberID: parseInt(id)
        });
        
        if (result[0] && result[0].length > 0) {
            res.json({
                success: true,
                message: 'Prescriber deactivated successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to deactivate prescriber'
            });
        }
    } catch (error) {
        console.error('❌ Deactivate prescriber error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// POST /api/doctors/:id/insurance - Add insurance partnership
// ============================================
router.post('/:id/insurance', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { insuranceProviderId, contractNumber, effectiveFrom, effectiveTo } = req.body;
        
        if (!insuranceProviderId) {
            return res.status(400).json({
                success: false,
                message: 'Insurance provider ID is required'
            });
        }
        
        // Get user ID from session
        const userId = req.user?.userId || 
                      req.user?.UserID || 
                      req.session?.user?.userId || 
                      req.session?.user?.UserID ||
                      req.session?.userId ||
                      req.session?.UserID;
        
        const result = await executeStoredProcedure('sp_AddPrescriberInsurance', {
            PrescriberID: parseInt(id),
            InsuranceProviderID: parseInt(insuranceProviderId),
            ContractNumber: contractNumber || null,
            EffectiveFrom: effectiveFrom || new Date().toISOString().split('T')[0],
            EffectiveTo: effectiveTo || null,
            CreatedBy: parseInt(userId)
        });
        
        if (result[0] && result[0].length > 0) {
            res.status(201).json({
                success: true,
                message: 'Insurance partnership added successfully',
                partnership: result[0][0]
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to add insurance partnership'
            });
        }
    } catch (error) {
        console.error('❌ Add insurance partnership error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// DELETE /api/doctors/insurance/:partnershipId - Remove insurance partnership
// ============================================
router.delete('/insurance/:partnershipId', requireAuth, async (req, res) => {
    try {
        const { partnershipId } = req.params;
        
        const result = await executeStoredProcedure('sp_RemovePrescriberInsurance', {
            PrescriberInsuranceID: parseInt(partnershipId)
        });
        
        if (result[0] && result[0].length > 0) {
            res.json({
                success: true,
                message: 'Insurance partnership removed successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to remove insurance partnership'
            });
        }
    } catch (error) {
        console.error('❌ Remove insurance partnership error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// GET /api/doctors/discounts/rates - Get all discount rates
// ============================================
router.get('/discounts/rates', requireAuth, async (req, res) => {
    try {
        const { insuranceProviderId } = req.query;
        
        const result = await executeStoredProcedure('sp_GetInsuranceDiscountRates', {
            InsuranceProviderID: insuranceProviderId ? parseInt(insuranceProviderId) : null
        });
        
        res.json({
            success: true,
            discountRates: result[0] || []
        });
    } catch (error) {
        console.error('❌ Get discount rates error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// PUT /api/doctors/discounts/rates/:insuranceId - Update discount rate
// ============================================
router.put('/discounts/rates/:insuranceId', requireAuth, async (req, res) => {
    try {
        const { insuranceId } = req.params;
        const { discountPercentage, minimumAmount, maximumDiscount, description } = req.body;
        
        if (!discountPercentage || discountPercentage < 0 || discountPercentage > 100) {
            return res.status(400).json({
                success: false,
                message: 'Valid discount percentage (0-100) is required'
            });
        }
        
        const userId = req.user?.userId || 
                      req.session?.user?.userId || 
                      req.session?.userId ||
                      1;
        
        const result = await executeStoredProcedure('sp_UpdateInsuranceDiscountRate', {
            InsuranceProviderID: parseInt(insuranceId),
            DiscountPercentage: parseFloat(discountPercentage),
            MinimumPrescriptionAmount: minimumAmount ? parseFloat(minimumAmount) : 0,
            MaximumDiscountAmount: maximumDiscount ? parseFloat(maximumDiscount) : null,
            Description: description || null,
            UpdatedBy: parseInt(userId)
        });
        
        if (result[0] && result[0].length > 0) {
            res.json({
                success: true,
                message: 'Discount rate updated successfully',
                discountRate: result[0][0]
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to update discount rate'
            });
        }
    } catch (error) {
        console.error('❌ Update discount rate error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// POST /api/doctors/discounts/calculate - Calculate prescription discount
// ============================================
router.post('/discounts/calculate', requireAuth, async (req, res) => {
    try {
        const { patientId, prescriberId, prescriptionAmount } = req.body;
        
        if (!patientId || !prescriberId || !prescriptionAmount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        
        const result = await executeStoredProcedure('sp_CalculatePrescriptionDiscount', {
            PatientID: parseInt(patientId),
            PrescriberID: parseInt(prescriberId),
            PrescriptionAmount: parseFloat(prescriptionAmount)
        });
        
        if (result[0] && result[0].length > 0) {
            res.json({
                success: true,
                discount: result[0][0]
            });
        } else {
            res.json({
                success: true,
                discount: {
                    InsuranceProviderID: null,
                    DiscountPercentage: 0,
                    OriginalAmount: prescriptionAmount,
                    DiscountAmount: 0,
                    FinalAmount: prescriptionAmount,
                    DiscountApplied: false
                }
            });
        }
    } catch (error) {
        console.error('❌ Calculate discount error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;