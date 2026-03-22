/** Landing page — shown to unauthenticated visitors. */

"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, FileUp, BarChart3, ArrowRight, Zap, Wallet, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const chartData = [
  { name: "Flights", spending: 1200, budget: 1300 },
  { name: "Stay", spending: 850, budget: 1000 },
  { name: "Food", spending: 600, budget: 500 },
  { name: "Tours", spending: 450, budget: 400 },
  { name: "Transport", spending: 300, budget: 350 },
];

export default function LandingPage() {
  const router = useRouter();

  function handleLogin() {
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-brand-primary/20">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight">SpendWise</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-brand-primary transition-colors">Features</a>
            <button
              onClick={handleLogin}
              className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-semibold hover:bg-brand-secondary transition-all shadow-md active:scale-95"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3 h-3" />
              Smart Spending Intelligence
            </div>
            <h1 className="text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-slate-900">
              See where your <span className="text-brand-primary">money</span> actually goes.
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-xl">
              Stop guessing and start knowing. Spendwise turns your messy bank statements into clear, actionable visual insights with a few simple clicks.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleLogin}
                className="px-8 py-4 bg-brand-primary text-white rounded-2xl font-bold text-lg flex items-center gap-2 hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/20 active:scale-95"
              >
                Start Visualizing
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <TrendingUp className="w-4 h-4 text-brand-primary" />
                Automated Categorization
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-brand-primary/5 rounded-[3rem] blur-3xl" />

            {/* Browser Frame */}
            <div className="relative bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden aspect-[4/3] lg:aspect-auto">
              {/* Browser Header */}
              <div className="h-12 bg-white border-b border-slate-100 flex items-center px-6 gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                </div>
                <div className="flex-1 max-w-md h-6 bg-slate-50 rounded-lg mx-auto" />
              </div>

              {/* App Preview */}
              <div className="relative h-[400px] bg-white p-8 overflow-hidden">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Greece Trip Spending</h3>
                  <p className="text-sm text-slate-500">Accommodation: <span className="text-emerald-600 font-bold">$150 under budget</span></p>
                </div>

                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                      />
                      <Bar dataKey="spending" radius={[6, 6, 0, 0]} barSize={40}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.name === "Stay" ? "#059669" : "#064e3b"}
                            fillOpacity={entry.spending > entry.budget ? 0.6 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Floating Cards */}
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="absolute top-8 right-0 p-6 bg-white rounded-l-[2rem] shadow-xl border-y border-l border-slate-100 min-w-[240px] z-10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Trip Savings</div>
                      <div className="text-3xl font-black text-slate-900 tracking-tight">$450</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  className="absolute bottom-12 left-0 p-6 bg-white rounded-r-[2rem] shadow-xl border-y border-r border-slate-100 min-w-[240px] z-10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Monthly Savings</div>
                      <div className="text-3xl font-black text-slate-900 tracking-tight">$650</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">Everything you need to master your money</h2>
            <p className="text-lg text-slate-600">Spendwise simplifies the complex world of personal finance into a few simple, beautiful clicks.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <FileUp className="w-8 h-8 text-brand-primary" />,
                title: "Effortless Uploads",
                description: "Drop your CSV statements from any bank or budgeting app. We handle the formatting so you don't have to.",
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-brand-primary" />,
                title: "Smart Categorization",
                description: "Our intelligent engine automatically tags your transactions with high precision. No more manual sorting.",
              },
              {
                icon: <BarChart3 className="w-8 h-8 text-brand-primary" />,
                title: "Visual Storytelling",
                description: "Turn rows of data into beautiful, interactive charts. Understand your habits at a glance.",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="p-10 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="mb-6 p-4 bg-brand-primary/5 rounded-2xl inline-block">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">SpendWise</span>
          </div>
          <div className="text-sm text-slate-500">
            © 2026 SpendWise. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
