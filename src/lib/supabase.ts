class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.operation = null;
    this.payload = null;
    this.options = {};
    this.expectSingle = false;
    this.maybeSingle = false;
  }

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

  eq(field, value) {
    this.filters.push({ field, op: 'eq', value });
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.options.order = { column, ascending };
    return this;
  }

  limit(count) {
    this.options.limit = count;
    return this;
  }

  single() {
    this.expectSingle = true;
    return this;
  }

  maybeSingle() {
    this.maybeSingle = true;
    return this;
  }

  async execute() {
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

    // 🔥 FIX your .single() bug here
    if (this.expectSingle) {
      if (!data || data.length === 0) {
        return { data: null, error: { code: 'PGRST116' } };
      }
      if (data.length > 1) {
        return { data: null, error: { code: 'PGRST117' } };
      }
      data = data[0];
    }

    if (this.maybeSingle) {
      data = data?.[0] || null;
    }

    return { data, error: json.error };
  }

  then(resolve, reject) {
    return this.execute().then(resolve).catch(reject);
  }
}

export const supabase = {
  from: (table) => new QueryBuilder(table)
};