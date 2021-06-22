const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;

  const user = users.find(user => user.username === username);

  if (!user) {
    return response.status(404).json({ error: 'User not found' });
  }

  request.user = user;

  return next();
}

function checksCreateTodosUserAvailability(request, response, next) {
  //Esse middleware deve receber o usuário já dentro do request
  const { user } = request;

  if (!user.pro && user.todos.length < 10) {
    return next();
  }

  if (!user.pro && user.todos.length === 10) {
    return response.status(403).json({ error: 'User plan pro' });
  }

  return next();

}

function checksTodoExists(request, response, next) {
//Recebendo username dentro do header 
const { username } = request.headers;
//Recebendo o id de um todo 
const { id } = request.params;

//validando que o id e um uuid 
const isValidId = validate(id);

//Se não for um id 
if (!isValidId) {
  return response.status(400).json({ error: 'Id not uuid' })
}

//buscando os dados do usuario 
const user = users.find(user => user.username === username);

//Verificando se usuario existe 
if (!user) {
  return response.status(404).json({ error: 'User not found' })
}

//Validar que esse id pertence ao todo 
const todo = user.todos.find(todo => todo.id === id);

//Se todo não for encontrada 
if(!todo) {
  return response.status(404).json({ error: 'Todo not Found' });
}

//Se for encontrada deve ser passado para o request e chamar a função next 
request.todo = todo;
request.user = user;

return next();
}

function findUserById(request, response, next) {
  //buscando user passando id na rota 
  const { id } = request.params;

  //procurando id 
  const user = users.find(user => user.id === id);

  //se id for encontrado passar dentro da requisição e se não retornar erro 
  if (!user) {
    return response.status(404).json({ error: 'User not found' })
  }

  request.user = user;

  return next();
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};