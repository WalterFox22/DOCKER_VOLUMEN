const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3000;

// Configura conexión a MySQL (ajusta user, password, host y dbname)
const connection = mysql.createConnection({
  host: 'localhost',       // si Node corre en host, si en Docker puede cambiar
  user: 'root',
  password: 'password',
  database: 'base_empleados'
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Página principal con tabla y botones
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Empleados</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; }
        th { background: #eee; }
        button { margin: 2px; }
      </style>
    </head>
    <body>
      <h2>Lista de empleados</h2>
      <button onclick="cargarDatos()">Refrescar</button>
      <table id="tabla">
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Cargo</th><th>Sueldo</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
      <script>
        function cargarDatos() {
          fetch('/api/personal')
            .then(r => r.json())
            .then(data => {
              const tbody = document.querySelector('#tabla tbody');
              tbody.innerHTML = '';
              data.forEach(emp => {
                const tr = document.createElement('tr');
                tr.innerHTML = \`
                  <td>\${emp.id}</td>
                  <td><input value="\${emp.nombre}" id="nombre-\${emp.id}"></td>
                  <td><input value="\${emp.cargo}" id="cargo-\${emp.id}"></td>
                  <td><input value="\${emp.sueldo}" id="sueldo-\${emp.id}"></td>
                  <td>
                    <button onclick="actualizar(\${emp.id})">Actualizar</button>
                    <button onclick="eliminar(\${emp.id})">Eliminar</button>
                  </td>
                \`;
                tbody.appendChild(tr);
              });
            });
        }
        function actualizar(id) {
          const nombre = document.getElementById('nombre-' + id).value;
          const cargo = document.getElementById('cargo-' + id).value;
          const sueldo = document.getElementById('sueldo-' + id).value;
          fetch('/api/personal/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, cargo, sueldo })
          }).then(() => cargarDatos());
        }
        function eliminar(id) {
          fetch('/api/personal/' + id, { method: 'DELETE' })
            .then(() => cargarDatos());
        }
        cargarDatos();
      </script>
    </body>
    </html>
  `);
});

// Endpoint para obtener datos (con búsqueda opcional)
app.get('/api/personal', (req, res) => {
  let sql = 'SELECT * FROM personal';
  const params = [];
  if (req.query.q) {
    sql += ' WHERE nombre LIKE ? OR cargo LIKE ?';
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }
  connection.query(sql, params, (err, results) => {
    if (err) {
      res.status(500).send('Error en consulta SQL');
      return;
    }
    // Forzar utf8 para evitar problemas de caracteres
    results = results.map(r => ({
      ...r,
      nombre: Buffer.from(r.nombre, 'binary').toString('utf8'),
      cargo: Buffer.from(r.cargo, 'binary').toString('utf8')
    }));
    res.json(results);
  });
});

// Endpoint para crear empleado
app.post('/api/personal', (req, res) => {
  const { nombre, cargo, sueldo } = req.body;
  connection.query(
    'INSERT INTO personal (nombre, cargo, sueldo) VALUES (?, ?, ?)',
    [nombre, cargo, sueldo],
    (err, result) => {
      if (err) return res.status(500).send('Error al crear');
      res.json({ id: result.insertId });
    }
  );
});

// Endpoint para eliminar
app.delete('/api/personal/:id', (req, res) => {
  connection.query('DELETE FROM personal WHERE id = ?', [req.params.id], err => {
    if (err) return res.status(500).send('Error al eliminar');
    res.sendStatus(200);
  });
});

// Endpoint para actualizar
app.put('/api/personal/:id', (req, res) => {
  const { nombre, cargo, sueldo } = req.body;
  connection.query(
    'UPDATE personal SET nombre = ?, cargo = ?, sueldo = ? WHERE id = ?',
    [nombre, cargo, sueldo, req.params.id],
    err => {
      if (err) return res.status(500).send('Error al actualizar');
      res.sendStatus(200);
    }
  );
});

app.listen(port, () => {
  console.log(`Servidor web corriendo en http://localhost:${port}`);
});