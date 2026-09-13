"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type Chore = { id: number; name: string; assignee: string; done: boolean };
type ListItem = { id: number; name: string; quantity: string; checked: boolean };

const events = [
  { time: "08:15", title: "School drop-off", note: "Maya & Theo" },
  { time: "16:30", title: "Piano lesson", note: "Maya · Studio 4" },
  { time: "18:00", title: "Family dinner", note: "At home" },
];

export default function Home() {
  const [chores, setChores] = useState<Chore[]>([
    { id: 1, name: "Feed Juniper", assignee: "Theo", done: false },
    { id: 2, name: "Set the table", assignee: "Maya", done: true },
    { id: 3, name: "Take out recycling", assignee: "Alex", done: false },
  ]);
  const [items, setItems] = useState<ListItem[]>([
    { id: 1, name: "Sourdough", quantity: "1 loaf", checked: false },
    { id: 2, name: "Clementines", quantity: "1 bag", checked: true },
    { id: 3, name: "Oat milk", quantity: "2 cartons", checked: false },
  ]);
  const [newItem, setNewItem] = useState("");
  const openChores = useMemo(() => chores.filter((chore) => !chore.done).length, [chores]);

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newItem.trim();
    if (!name) return;
    setItems((current) => [...current, { id: Date.now(), name, quantity: "", checked: false }]);
    setNewItem("");
  }

  return (
    <main className="shell">
      <aside className="rail">
        <a className="brand" href="#top" aria-label="Nest home"><span>N</span>est</a>
        <nav aria-label="Primary navigation">
          <a className="active" href="#today">Today</a>
          <a href="#calendar">Calendar</a>
          <a href="#chores">Chores <b>{openChores}</b></a>
          <a href="#lists">Lists</a>
        </nav>
        <div className="household">
          <p>SAMPLE HOUSEHOLD</p>
          <strong>Sign in to see yours</strong>
          <Link href="/login">Sign in</Link>
        </div>
      </aside>

      <section className="content" id="top">
        <header className="topbar">
          <div><p className="eyebrow">A CALMER HOUSEHOLD</p><h1>Good morning.</h1></div>
          <div className="actions"><Link className="quiet" href="/login">Sign in</Link><Link className="avatar" href="/signup" aria-label="Create an account">+</Link></div>
        </header>

        <section className="overview" id="today" aria-labelledby="today-heading">
          <div className="overview-copy"><p className="eyebrow">YOUR HOUSEHOLD, IN RHYTHM</p><h2 id="today-heading">A little structure<br />for the good stuff.</h2><p>Three things to tend to, one place to see the day. This preview uses sample data &mdash; sign in to manage your real household.</p><Link className="primary" href="/households/new">Create your household <span>→</span></Link></div>
          <div className="date-tile" aria-label="Tuesday September 12"><span>TUE</span><strong>12</strong><em>September</em></div>
        </section>

        <div className="grid">
          <section className="panel schedule" id="calendar" aria-labelledby="schedule-heading">
            <div className="panel-heading"><div><p className="eyebrow">AT A GLANCE</p><h2 id="schedule-heading">Today&apos;s rhythm</h2></div><button type="button" className="text-button">View calendar</button></div>
            <ol>{events.map((event) => <li key={event.title}><time>{event.time}</time><div><strong>{event.title}</strong><span>{event.note}</span></div></li>)}</ol>
          </section>

          <section className="panel chores" id="chores" aria-labelledby="chores-heading">
            <div className="panel-heading"><div><p className="eyebrow">SHARED RESPONSIBILITIES</p><h2 id="chores-heading">Chores</h2></div><span className="count">{openChores} open</span></div>
            <ul>{chores.map((chore) => <li key={chore.id}><button className={`check ${chore.done ? "complete" : ""}`} type="button" aria-label={`Mark ${chore.name} ${chore.done ? "incomplete" : "complete"}`} onClick={() => setChores((all) => all.map((item) => item.id === chore.id ? { ...item, done: !item.done } : item))}>{chore.done && "✓"}</button><span className={chore.done ? "done" : ""}>{chore.name}<small>{chore.assignee}</small></span></li>)}</ul>
          </section>

          <section className="panel groceries" id="lists" aria-labelledby="list-heading">
            <div className="panel-heading"><div><p className="eyebrow">SATURDAY MARKET</p><h2 id="list-heading">Shopping list</h2></div><button type="button" className="text-button">All lists</button></div>
            <ul>{items.map((item) => <li key={item.id}><button className={`check ${item.checked ? "complete" : ""}`} type="button" aria-label={`Mark ${item.name} ${item.checked ? "unbought" : "bought"}`} onClick={() => setItems((all) => all.map((current) => current.id === item.id ? { ...current, checked: !current.checked } : current))}>{item.checked && "✓"}</button><span className={item.checked ? "done" : ""}>{item.name}<small>{item.quantity}</small></span></li>)}</ul>
            <form onSubmit={addItem}><label className="sr-only" htmlFor="item">Add an item</label><input id="item" value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Add an item" /><button type="submit">Add</button></form>
          </section>
        </div>
      </section>
    </main>
  );
}
