const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer')
const ejs = require('ejs');

const connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'sqluser',
	password : 'password',
	database : 'nodelogin'
});

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
	  cb(null, 'uploads/')
	},
	filename: function (req, file, cb) {
	  cb(null, file.originalname)
	}
  })

const upload = multer({ storage: storage })

const app = express();

function buscarArquivoPorId(id) {
    // Fazer a busca no banco de dados usando o ID como parâmetro
    const arquivo = bancoDeDados.find(arq => arq.id == id);
    // Retornar o objeto do arquivo encontrado, ou null caso o arquivo não seja encontrado
    return arquivo || null;
}

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));

// http://localhost:3000/
app.get('/', function(request, response) {
	// Render login template
	response.sendFile(path.join(__dirname + '/login.html'));
});

// http://localhost:3000/auth
app.post('/auth', function(request, response) {
	// Capture the input fields
	let username = request.body.username;
	let password = request.body.password;
	// Ensure the input fields exists and are not empty
	//username and password
	if (username && password) {
		// Execute SQL query that'll select the account from the database based on the specified username and password
		//connection.query('SELECT * FROM fonoaudiologos WHERE usuario = ? AND senha = ?', [username, password], function(error, results, fields) {
			connection.query('SELECT tipo FROM pacientes WHERE usuario = ? AND senha = ? UNION SELECT tipo FROM fonoaudiologos WHERE usuario = ? AND senha = ?',
			[username, password,username, password], function(error, results, fields) {

			// If there is an issue with the query, output the error
			if (error) throw error;
			// If the account exists
			if (results.length > 0) {
				// Authenticate the user
				request.session.loggedin = true;
				request.session.username = username;
				// Redirect to home page
				if (results[0].tipo === "fonoaudiologo") {
					response.redirect('/homeFono.html');
				  } else if (results[0].tipo === "paciente") {
					response.redirect('/homePaciente.html');
				  }
			}		
			else {
				response.send('Incorrect Username and/or Password!');
			}			
			response.end();
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});

// http://localhost:3000/home
app.get('/home', (req, res) => {
	if (req.session.tipo === 'fonoaudiologo') {
	  res.sendFile(__dirname + '/homeFono.html');
	} else if (req.session.tipo === 'paciente') {
	  res.sendFile(__dirname + '/homePaciente.html');
	} else {
	  res.redirect('/login');
	}
  });


//UPLOAD AND DOWNLOAD

app.post('/upload', upload.single('file'), (req, res) => {
	// Recuperar informações do arquivo enviado
	const file = req.file
	const username = req.body.username

	// Buscar id do usuário com base no nome de usuário fornecido
	connection.query('SELECT id FROM pacientes WHERE usuario = ?', [username], function(error, results) {
		if (error) throw error;
		const id_usuario = results[0].id;
	
		// Inserir informações no banco de dados
		connection.query('INSERT INTO arquivosPacientes (nome, tamanho, tipo, data_upload, fk_id_usuario) VALUES (?,?,?,?,?)', [req.file.originalname, req.file.size, req.file.mimetype, new Date(), id_usuario], function(error, results) {
		if (error) throw error;
		});
	});
});

app.get('/download', (req, res) => {
    const id_usuario = req.query.id_usuario;
    // Buscar arquivo no banco de dados baseado no id do usuário
    connection.query('SELECT * FROM arquivosPacientes WHERE fk_id_usuario = ?', [id_usuario], function(error, results) {
        if (error) throw error;
        const arquivo = results[0];
        // Enviar arquivo para o cliente
        res.setHeader('Content-disposition', 'attachment; filename=' + arquivo.nome);
        res.setHeader('Content-type', arquivo.tipo);
        res.download(path.join(__dirname, 'uploads/' + arquivo.nome));
    });
});

app.get('/homePaciente', (req, res) => {
    connection.query('SELECT * FROM arquivospacientes', (error, results) => {
        if (error) throw error;
        res.render('arquivos', { arquivos: results });
    });
});

app.get('/homePaciente:id', (req, res) => {
    const id = req.params.id;
    // Buscar arquivo no banco de dados
    connection.query(`SELECT * FROM arquivospaciente`, (error, results) => {
        if (error) throw error;
        if(!results[0]) return res.status(404).send("Arquivo não encontrado");
        const arquivo = results[0];
        res.setHeader('Content-Disposition', 'attachment; filename=' + arquivo.nome);
        res.setHeader('Content-Type', arquivo.tipo);
        res.setHeader('Content-Length', arquivo.tamanho);
        res.send(arquivo.dados);
    });
});

app.get('/test', (req, res) => {
    res.render('test', { title: 'Testando EJS' });
});


app.listen(3000);

/*Lista de bugs
1 - Caso o nome do usuário não seja o mesmo que o de login, o app buga por causa da fk do usuário
*/ 