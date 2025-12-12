const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

const isWindowsAuth = process.env.DB_AUTH === 'windows';

// Build connection string for msnodesqlv8
let connectionString;

if (isWindowsAuth) {
    // Windows Authentication
    connectionString = `server=${process.env.DB_SERVER};Database=${process.env.DB_DATABASE};Trusted_Connection=Yes;Driver={ODBC Driver 17 for SQL Server};`;
} else {
    // SQL Server Authentication
    connectionString = `server=${process.env.DB_SERVER};Database=${process.env.DB_DATABASE};Uid=${process.env.DB_USER};Pwd=${process.env.DB_PASSWORD};Driver={ODBC Driver 17 for SQL Server};`;
}

const config = {
    connectionString: connectionString,
    options: {
        trustedConnection: isWindowsAuth,
        enableArithAbort: true
    }
};

let pool = null;

async function getPool() {
    if (!pool) {
        try {
            console.log('🔄 Connecting to database with ODBC driver...');
            console.log('   Server:', process.env.DB_SERVER);
            console.log('   Database:', process.env.DB_DATABASE);
            console.log('   Auth:', isWindowsAuth ? 'Windows' : 'SQL');
            
            pool = await sql.connect(config);
            console.log('✅ Connected to database:', process.env.DB_DATABASE);
        } catch (err) {
            console.error('❌ Database connection error:', err.message);
            console.error('');
            console.error('If you see "ODBC Driver 17" error, you may need to:');
            console.error('1. Install ODBC Driver 17 or 18 from Microsoft');
            console.error('2. Or change DB_ODBC_DRIVER in .env to match your installed driver');
            throw err;
        }
    }
    return pool;
}

async function executeStoredProcedure(procedureName, params = {}) {
    try {
        const pool = await getPool();
        const request = pool.request();
        
        // Add parameters
        Object.keys(params).forEach(key => {
            const value = params[key];
            if (value !== null && value !== undefined) {
                request.input(key, value);
            }
        });
        
        const result = await request.execute(procedureName);
        return result.recordsets;
    } catch (error) {
        console.error(`❌ Error executing ${procedureName}:`, error.message);
        throw error;
    }
}

// Test connection on startup
getPool().catch(err => {
    console.error('Failed to connect to database on startup');
    process.exit(1);
});

module.exports = { 
    executeStoredProcedure, 
    sql,
    getPool 
};