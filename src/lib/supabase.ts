class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.operation = null;
    this.payload = null;
    this.options = {};
    this.expectSingle = false;
    this.allowMaybeSingle = false; // ✅ FIXED name
  }

  // -------------------------
  // OPERATIONS
  // -------------------------
  select(columns = '*') {
    this.operation = 'select';
    this.options.columns = columns;
    return this;
  }

  insert(data) {
    this.operation = 'insert';
    this.payload = data;
    return this;
  }

  update(data) {
    this.operation = 'update';
    this.payload = data;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  // -------------------------
  // FILTERS
  // -------------------------
  eq(field, value) {
    this.filters.push({ field, op: 'eq', value });
    return this;
  }

  neq(field, value) {
    this.filters.push({ field, op: 'neq', value });
    return this;
  }

  like(field, value) {
    this.filters.push({ field, op: 'like', value });
    return this;
  }

  in(field, values) {
    this.filters.push({ field, op: 'in', value: values });
    return this;
  }

  // -------------------------
  // MODIFIERS
  // -------------------------
  order(column, { ascending = true } = {}) {
    this.options.order = { column, ascending };
    return this;
  }

  limit(count) {
    this.options.limit = count;
    return this;
  }

  // -------------------------
  // RESULT MODIFIERS
  // -------------------------
  single() {
    this.expectSingle = true;
    return this;
  }

  maybeSingle() {
    this.allowMaybeSingle = true;
    return this;
  }

  // -------------------------
  // EXECUTION (CORE)
  // -------------------------
  async execute() {
    try {
      if (!this.operation) {
        throw new Error('No operation specified (select, insert, update, delete)');
      }

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.table,
          operation: this.operation,
          filters: this.filters,
          payload: this.payload,
          options: this.options
        })
      });

      const json = await res.json();

      let data = json.data;
      let error = json.error;

      // -------------------------
      // 🔥 FIX: .single()
      // -------------------------
      if (this.expectSingle) {
        if (!data || data.length === 0) {
          return {
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' }
          };
        }

        if (data.length > 1) {
          return {
            data: null,
            error: { code: 'PGRST117', message: 'Multiple rows found' }
          };
        }

        data = data[0];
      }

      // -------------------------
      // 🔥 FIX: .maybeSingle()
      // -------------------------
      if (this.allowMaybeSingle) {
        data = data?.[0] || null;
      }

      return { data, error };

    } catch (err) {
      return {
        data: null,
        error: { message: err.message }
      };
    }
  }

  // -------------------------
  // PROMISE SUPPORT (CRITICAL)
  // -------------------------
  then(resolve, reject) {
    return this.execute().then(resolve).catch(reject);
  }
}

// -------------------------
// EXPORT
// -------------------------
export const supabase = {
  from: (table) => new QueryBuilder(table)
};