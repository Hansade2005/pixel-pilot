
class PiPilot {
    constructor(apiKey, databaseId, options = {}) {
        this.apiKey = apiKey;
        this.databaseId = databaseId;
        this.apiUrl = 'https://pipilot.dev/api/v1';
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000; // Base delay in ms
        this.rateLimitRemaining = null;
        this.rateLimitReset = null;
    }

    // Rate limiting and retry logic
    async _makeRequest(url, options, retryCount = 0) {
        const response = await fetch(url, options);

        // Update rate limit tracking from headers
        this.rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        this.rateLimitReset = response.headers.get('X-RateLimit-Reset');

        if (response.status === 429) {
            // Rate limit exceeded
            const errorData = await response.json().catch(() => ({}));
            const resetIn = errorData.reset_in || 'unknown time';

            if (retryCount < this.maxRetries) {
                // Calculate delay with exponential backoff
                const delay = this.retryDelay * Math.pow(2, retryCount);
                console.warn(`Rate limit exceeded. Retrying in ${delay}ms. Reset in: ${resetIn}`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this._makeRequest(url, options, retryCount + 1);
            } else {
                throw new Error(`Rate limit exceeded after ${this.maxRetries} retries. Reset in: ${resetIn}. Limit: ${errorData.limit}, Usage: ${errorData.usage}`);
            }
        }

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = `Request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`;
            } catch (e) {
                // If we can't parse error JSON, use the basic message
            }
            throw new Error(errorMessage);
        }

        return response;
    }

    // Get current rate limit status
    getRateLimitStatus() {
        return {
            remaining: this.rateLimitRemaining,
            resetAt: this.rateLimitReset
        };
    }

    async fetchTableRecords(tableId) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}/records`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.records && Array.isArray(result.records)) {
            const data = result.records.map(record => ({
                id: record.id,
                table_id: record.table_id,
                ...record.data_json,
                created_at: record.created_at,
                updated_at: record.updated_at
            }));

            return {
                success: true,
                data: data,
                rowCount: data.length,
                totalCount: result.pagination?.total || data.length,
                pagination: result.pagination
            };
        }

        return {
            success: false,
            data: [],
            rowCount: 0,
            totalCount: 0
        };
    }

    async insertTableRecord(tableId, data) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}/records`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: data
                })
            }
        );

        const result = await response.json();

        if (result.record) {
            const insertedData = {
                id: result.record.id,
                table_id: result.record.table_id,
                ...result.record.data_json,
                created_at: result.record.created_at,
                updated_at: result.record.updated_at
            };

            return {
                success: true,
                data: insertedData,
                message: 'Record inserted successfully'
            };
        }

        return {
            success: false,
            message: 'Insert failed'
        };
    }

    async updateTableRecord(tableId, recordId, data) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}/records/${recordId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: data
                })
            }
        );

        const result = await response.json();

        if (result.record) {
            const updatedData = {
                id: result.record.id,
                table_id: result.record.table_id,
                ...result.record.data_json,
                created_at: result.record.created_at,
                updated_at: result.record.updated_at
            };

            return {
                success: true,
                data: updatedData,
                message: 'Record updated successfully'
            };
        }

        return {
            success: false,
            message: 'Update failed'
        };
    }

    async deleteTableRecord(tableId, recordId) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}/records/${recordId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        return {
            success: true,
            message: 'Record deleted successfully',
            deleted_id: recordId
        };
    }

    // Table Management Methods
    async listTables(options = {}) {
        const { includeSchema = true, includeRecordCount = true } = options;
        const params = new URLSearchParams({
            includeSchema: includeSchema.toString(),
            includeRecordCount: includeRecordCount.toString()
        });

        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.success && result.tables) {
            return {
                success: true,
                tables: result.tables,
                total: result.total || result.tables.length,
                message: `Found ${result.tables.length} table(s)`
            };
        }

        return {
            success: false,
            tables: [],
            total: 0,
            message: 'No tables found'
        };
    }

    async createTable(name, schema) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    schema: schema
                })
            }
        );

        const result = await response.json();

        if (result.success && result.table) {
            return {
                success: true,
                table: result.table,
                message: `Table "${name}" created successfully`
            };
        }

        return {
            success: false,
            message: 'Table creation failed'
        };
    }

    async readTable(tableId, options = {}) {
        const { includeRecordCount = true } = options;
        const params = new URLSearchParams({
            includeRecordCount: includeRecordCount.toString()
        });

        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.success && result.table) {
            return {
                success: true,
                table: result.table,
                message: `Table "${result.table.name}" read successfully`
            };
        }

        return {
            success: false,
            message: 'Table not found'
        };
    }

    async deleteTable(tableId) {
        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.success) {
            return {
                success: true,
                table_name: result.table_name,
                deleted_records: result.deleted_records,
                message: `Table "${result.table_name}" deleted successfully with ${result.deleted_records} record(s)`
            };
        }

        return {
            success: false,
            message: 'Table deletion failed'
        };
    }

    async queryTable(tableId, options = {}) {
        const {
            select,
            where,
            whereConditions,
            orderBy,
            limit = 100,
            offset = 0,
            search,
            includeCount = true
        } = options;

        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
            includeCount: includeCount.toString()
        });

        if (select && select.length > 0 && !select.includes('*')) {
            params.append('select', select.join(','));
        }

        if (where) {
            params.append('conditions', JSON.stringify([where]));
        }

        if (whereConditions && whereConditions.length > 0) {
            params.append('conditions', JSON.stringify(whereConditions));
        }

        if (orderBy) {
            params.append('orderBy', orderBy.field);
            params.append('orderDirection', orderBy.direction || 'ASC');
        }

        if (search) {
            params.append('search', search);
        }

        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/tables/${tableId}/query?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = await response.json();

        if (result.success) {
            return {
                success: true,
                data: result.data || [],
                total: result.total || 0,
                rowCount: result.data?.length || 0,
                pagination: {
                    limit: limit,
                    offset: offset,
                    has_more: result.has_more || false
                },
                message: `Query executed successfully, returned ${result.data?.length || 0} record(s)`
            };
        }

        return {
            success: false,
            data: [],
            total: 0,
            rowCount: 0,
            message: 'Query failed'
        };
    }

    async signup(email, password, fullName) {
        const response = await this._makeRequest(`${this.apiUrl}/databases/${this.databaseId}/auth/signup`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                full_name: fullName
            })
        });

        return await response.json();
    }

    async login(email, password) {
        const response = await this._makeRequest(`${this.apiUrl}/databases/${this.databaseId}/auth/login`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        return await response.json();
    }

    async verify(token) {
        const response = await this._makeRequest(`${this.apiUrl}/databases/${this.databaseId}/auth/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token
            })
        });

        return await response.json();
    }

    async refresh(refreshToken) {
        const response = await this._makeRequest(`${this.apiUrl}/databases/${this.databaseId}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh_token: refreshToken
            })
        });

        return await response.json();
    }

    async uploadFile(file, isPublic = true, metadata = {}) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_public', isPublic.toString());
        formData.append('metadata', JSON.stringify(metadata));

        const response = await this._makeRequest(
            `${this.apiUrl}/databases/${this.databaseId}/storage/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: formData,
            }
        );

        const data = await response.json();

        if (data.success) {
            return data.file;
        } else {
            throw new Error(data.error);
        }
    }
}

module.exports = PiPilot;
