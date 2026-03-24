<script setup lang="ts">
import axios from 'axios';
import { ref } from 'vue';

interface Pessoa {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
}

const selecionados = ref<number[]>([]);
const carregando = ref(false);
const mensagem = ref('');

const listaPessoas = ref<Pessoa[]>([
  {
    id: 7,
    email: 'michael.lawson@reqres.in',
    first_name: 'Michael',
    last_name: 'Lawson',
    avatar: 'https://i.pravatar.cc/150?img=7',
  },
  {
    id: 8,
    email: 'lindsay.ferguson@reqres.in',
    first_name: 'Lindsay',
    last_name: 'Ferguson',
    avatar: 'https://i.pravatar.cc/150?img=3',
  },
  {
    id: 9,
    email: 'tobias.funke@reqres.in',
    first_name: 'Tobias',
    last_name: 'Funke',
    avatar: 'https://i.pravatar.cc/150?img=6',
  },
  {
    id: 10,
    email: 'byron.fields@reqres.in',
    first_name: 'Byron',
    last_name: 'Fields',
    avatar: 'https://i.pravatar.cc/150?img=5',
  },
]);
const campos = Object.keys(listaPessoas.value[0]);

const PessoaTemp = ref<Pessoa>(createPessoa());

function adicionarLista(){
  listaPessoas.value.push({...PessoaTemp.value});
  resetPessoaTemp();
  console.log(PessoaTemp.value);
}

function removerLista(id: number){
  listaPessoas.value.splice(id, 1);
}

const resetPessoaTemp = () => {
  Object.assign(PessoaTemp.value, createPessoa());
};

function createPessoa(): Pessoa {
  const id = Math.max(...listaPessoas.value.map(pessoa => pessoa.id)) +1;
  return {
    id: id,
    email: '',
    first_name: '',
    last_name: '',
    avatar: 'https://i.pravatar.cc/150?img='+id,
  };
}

async function enviarForm() {
  carregando.value = true;
  mensagem.value = '';

  await axios
    .post('https://localhost:8000/teste', {
      data: listaPessoas.value,
      selecionados: selecionados.value,
    })
    .then((response) => {
      mensagem.value = 'Dados enviados com sucesso.';
    console.log('Resposta do servidor:', response.data);
    })
    .catch((error) => {
      mensagem.value = 'Falha ao enviar os dados. Verifique o backend.';
      console.error('Erro ao enviar dados:', error);
    })
    .finally(() => {
      carregando.value = false;
    });
}
</script>

<template>
  <main class="cadastro py-4">
    <div class="container-fluid">
      {{PessoaTemp}}
      <div class="row">
        <template v-for="campo in campos" :key="campo">
          <div v-if="campo != 'id'" class="input-group">
              <label class="col-md-2">{{campo}}</label>
            <input class="col-md-10" type="text" v-model="PessoaTemp[campo]" :name="campo"/>
          </div>
        </template>
      </div>

      <button type="button" class="btn btn-primary" v-on:click="adicionarLista()"> salvar</button>

      <div class="card justify-content-center">
        <table>
            <tr>
              <th v-for="campo in campos" :key="campo" >
                  {{campo.toUpperCase()}}
              </th>
            </tr>
              <tr v-for="lista in listaPessoas" :key="lista.id">
                <td v-for="campo in campos" :key="campo">
                  <img v-if="campo == 'avatar'" v-bind:src="lista[campo]" alt="avatar">
                  <span v-else v-html="lista[campo]"></span>
                </td>
              </tr>
        </table>
      </div>
    </div>
  </main>
</template>
