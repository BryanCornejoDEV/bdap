import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";


export default function Login() {
const { login } = useAuth();
const nav = useNavigate();
const [form, setForm] = useState({ email: "", password: "" });


const submit = async (e) => {
e.preventDefault();
await login(form);
nav("/");
};


return (
<div className="min-h-screen grid place-items-center p-6">
<form onSubmit={submit} className="w-full max-w-sm space-y-3">
<h1 className="text-2xl font-semibold">BDAP — Iniciar sesión</h1>
<input className="border w-full p-2" placeholder="Email" value={form.email}
onChange={(e)=>setForm(v=>({...v,email:e.target.value}))} />
<input className="border w-full p-2" placeholder="Password" type="password" value={form.password}
onChange={(e)=>setForm(v=>({...v,password:e.target.value}))} />
<button className="bg-black text-white px-4 py-2 w-full">Entrar</button>
</form>
</div>
);
}