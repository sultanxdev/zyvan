'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  Search01Icon,
  CopyIcon,
  Tick01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  GithubIcon,
  Menu01Icon,
  Cancel01Icon,
  SparklesIcon,
  ShieldCheckIcon,
  Alert01Icon,
  CheckmarkCircle02Icon,
  Book01Icon,
  CodeCircleIcon,
  Layers01Icon,
  Database01Icon,
  ServerIcon,
  FlashIcon,
} from '@hugeicons/core-free-icons';

import { DOCS_NAVIGATION, DOCS_DATA, DocItem } from '@/lib/docs-content';

function DocsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentDocId = searchParams.get('doc') || 'introduction';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCodeLang, setActiveCodeLang] = useState<'curl' | 'node' | 'python' | 'go'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'GET STARTED': true,
    GUIDES: true,
    WEBHOOKS: true,
    'API REFERENCE': true,
    CONCEPTS: true,
    SDKs: true,
    RESOURCES: true,
  });

  // Current doc or fallback
  const currentDoc: DocItem = DOCS_DATA[currentDocId] || DOCS_DATA['introduction'];

  // Flattened navigation list for previous/next pagination
  const flatDocList = useMemo(() => {
    const list: { id: string; title: string; category: string }[] = [];
    DOCS_NAVIGATION.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.subItems) {
          item.subItems.forEach((sub) => {
            list.push({ id: sub.id, title: sub.title, category: cat.title });
          });
        } else {
          list.push({ id: item.id, title: item.title, category: cat.title });
        }
      });
    });
    return list;
  }, []);

  const currentIndex = flatDocList.findIndex((item) => item.id === currentDoc.id);
  const prevDoc = currentIndex > 0 ? flatDocList[currentIndex - 1] : null;
  const nextDoc = currentIndex < flatDocList.length - 1 ? flatDocList[currentIndex + 1] : null;

  // Search filtering
  const filteredNav = useMemo(() => {
    if (!searchQuery.trim()) return DOCS_NAVIGATION;
    const q = searchQuery.toLowerCase();

    return DOCS_NAVIGATION.map((cat) => {
      const filteredItems = cat.items
        .map((item) => {
          if (item.subItems) {
            const matchedSubs = item.subItems.filter(
              (sub) =>
                sub.title.toLowerCase().includes(q) ||
                DOCS_DATA[sub.id]?.description?.toLowerCase().includes(q)
            );
            if (matchedSubs.length > 0) {
              return { ...item, subItems: matchedSubs };
            }
          }
          if (
            item.title.toLowerCase().includes(q) ||
            DOCS_DATA[item.id]?.description?.toLowerCase().includes(q)
          ) {
            return item;
          }
          return null;
        })
        .filter(Boolean) as typeof cat.items;

      return {
        ...cat,
        items: filteredItems,
      };
    }).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  const selectDoc = (id: string) => {
    router.push(`/docs?doc=${id}`);
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleCategory = (title: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ============================================================ */}
      {/* TOP HEADER (Mintlify Style)                                   */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-8 py-3 transition-all">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          {/* Brand & Breadcrumbs */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              aria-label="Open Sidebar"
            >
              <Icon icon={mobileSidebarOpen ? Cancel01Icon : Menu01Icon} size={18} />
            </button>

            <Link href="/" className="flex items-center gap-2.5">
              <div className="size-7 rounded-full bg-black flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Zyvan" className="w-full h-full object-cover" />
              </div>
              <span className="font-semibold text-lg tracking-tight lowercase">zyvan</span>
            </Link>

            <span className="hidden sm:inline text-zinc-300">/</span>

            {/* Breadcrumb path */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-zinc-500">
              <Link href="/docs" className="hover:text-zinc-900 transition-colors">
                Docs
              </Link>
              <span>›</span>
              <span className="text-zinc-400">{currentDoc.category}</span>
              <span>›</span>
              <span className="text-zinc-900 font-semibold">{currentDoc.title}</span>
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-64">
              <Icon
                icon={Search01Icon}
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Quick search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-zinc-200/80 bg-zinc-50 py-1.5 pl-8 pr-8 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <a
              href="https://github.com/sultanxdev/zyvan"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center size-8 rounded-full border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
              title="GitHub Repository"
            >
              <Icon icon={GithubIcon} size={15} />
            </a>

            <Button
              size="sm"
              asChild
              className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-xs px-3.5 h-8 font-medium shadow-xs"
            >
              <Link href="/dashboard" className="flex items-center gap-1.5">
                <span>Dashboard</span>
                <Icon icon={ArrowRight01Icon} size={13} />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 3-COLUMN MINTLIFY LAYOUT                                     */}
      {/* ============================================================ */}
      <div className="max-w-[1440px] mx-auto w-full flex-1 flex px-4 sm:px-8">
        {/* ============================================================ */}
        {/* LEFT SIDEBAR: DOCUMENTATION TREE (Mintlify Accordion)         */}
        {/* ============================================================ */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 transform bg-white border-r border-zinc-200/80 p-5 pt-20 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:p-4 lg:pt-6 lg:w-64 shrink-0 overflow-y-auto ${
            mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Mobile search input */}
          <div className="mb-4 lg:hidden">
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900"
            />
          </div>

          <div className="space-y-6 text-[13px]">
            {filteredNav.map((cat) => (
              <div key={cat.title}>
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.title)}
                  className="flex items-center justify-between w-full font-bold text-[11px] uppercase tracking-wider text-zinc-400 hover:text-zinc-700 py-1 mb-1 font-mono"
                >
                  <span>{cat.title}</span>
                  <span className="text-[10px] text-zinc-400">
                    {expandedCategories[cat.title] !== false ? '▾' : '▸'}
                  </span>
                </button>

                {expandedCategories[cat.title] !== false && (
                  <ul className="space-y-1 mt-1 border-l border-zinc-100 pl-2">
                    {cat.items.map((item) => {
                      if (item.subItems) {
                        return (
                          <li key={item.id} className="pt-1">
                            <span className="block px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                              {item.title}
                            </span>
                            <ul className="space-y-0.5 ml-2 border-l border-zinc-100 pl-2">
                              {item.subItems.map((sub) => {
                                const isActive = currentDoc.id === sub.id;
                                return (
                                  <li key={sub.id}>
                                    <button
                                      onClick={() => selectDoc(sub.id)}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                                        isActive
                                          ? 'bg-emerald-500/10 text-emerald-800 font-semibold border-l-2 border-emerald-500'
                                          : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                                      }`}
                                    >
                                      <span className="truncate">{sub.title}</span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </li>
                        );
                      }

                      const isActive = currentDoc.id === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => selectDoc(item.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-800 font-semibold border-l-2 border-emerald-500'
                                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                            }`}
                          >
                            <span className="truncate">{item.title}</span>
                            {item.apiMethod && (
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md font-bold uppercase ${
                                  item.apiMethod === 'POST'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-sky-100 text-sky-700'
                                }`}
                              >
                                {item.apiMethod}
                              </span>
                            )}
                            {item.badge && (
                              <span className="text-[10px] font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/20 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* ============================================================ */}
        {/* CENTER CONTENT: MINTLIFY MDX ARTICLE                         */}
        {/* ============================================================ */}
        <main className="flex-1 min-w-0 py-8 lg:px-12 max-w-3xl mx-auto">
          {/* Document Header */}
          <div className="mb-8 pb-6 border-b border-zinc-100">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
                {currentDoc.category}
              </Badge>
              <span className="text-zinc-300">•</span>
              <span className="text-xs text-zinc-400 font-medium">{currentDoc.readTime}</span>
              <span className="text-zinc-300">•</span>
              <span className="text-xs text-zinc-400 font-mono">v0.1</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 leading-tight">
              {currentDoc.title}
            </h1>

            <p className="mt-3 text-base text-zinc-600 leading-relaxed">
              {currentDoc.description}
            </p>

            {/* If this document has an API endpoint specification */}
            {currentDoc.apiMethod && currentDoc.apiPath && (
              <div className="mt-4 inline-flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-2 font-mono text-xs text-zinc-900 shadow-2xs">
                <span
                  className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                    currentDoc.apiMethod === 'POST'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-sky-600 text-white'
                  }`}
                >
                  {currentDoc.apiMethod}
                </span>
                <span className="font-semibold text-zinc-800">{currentDoc.apiPath}</span>
              </div>
            )}
          </div>

          {/* Document Body Intro */}
          <div className="prose prose-zinc max-w-none text-zinc-700 leading-relaxed text-[15px] space-y-6">
            <p>{currentDoc.content.intro}</p>

            {/* Mintlify Callout Alerts */}
            {currentDoc.content.callout && (
              <div
                className={`my-6 rounded-2xl p-4 sm:p-5 border text-sm leading-relaxed ${
                  currentDoc.content.callout.type === 'tip'
                    ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                    : currentDoc.content.callout.type === 'warning'
                    ? 'bg-amber-50/60 border-amber-200/80 text-amber-950'
                    : currentDoc.content.callout.type === 'security'
                    ? 'bg-purple-50/60 border-purple-200/80 text-purple-950'
                    : 'bg-sky-50/60 border-sky-200/80 text-sky-950'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold mb-1 text-xs uppercase tracking-wider">
                  <Icon
                    icon={
                      currentDoc.content.callout.type === 'security'
                        ? ShieldCheckIcon
                        : currentDoc.content.callout.type === 'warning'
                        ? Alert01Icon
                        : currentDoc.content.callout.type === 'tip'
                        ? SparklesIcon
                        : CheckmarkCircle02Icon
                    }
                    size={16}
                  />
                  <span>{currentDoc.content.callout.title}</span>
                </div>
                <p className="text-[13.5px] mt-1 text-zinc-700">
                  {currentDoc.content.callout.text}
                </p>
              </div>
            )}

            {/* Mintlify Interactive Code Tabs */}
            {currentDoc.content.codeSnippets && (
              <div className="my-6 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-lg overflow-hidden font-mono text-xs text-white">
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {(['curl', 'node', 'python', 'go'] as const).map((lang) => {
                      if (!currentDoc.content.codeSnippets?.[lang]) return null;
                      return (
                        <button
                          key={lang}
                          onClick={() => setActiveCodeLang(lang)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors uppercase ${
                            activeCodeLang === lang
                              ? 'bg-zinc-800 text-white shadow-2xs font-semibold'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {lang === 'node' ? 'Node.js' : lang}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() =>
                      copyCode(
                        'main-snippet',
                        currentDoc.content.codeSnippets?.[activeCodeLang] ||
                          currentDoc.content.codeSnippets?.curl ||
                          ''
                      )
                    }
                    className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors text-[11px]"
                  >
                    <Icon icon={copiedKey === 'main-snippet' ? Tick01Icon : CopyIcon} size={13} />
                    <span>{copiedKey === 'main-snippet' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-[12px] text-zinc-200 leading-relaxed">
                  <code>
                    {currentDoc.content.codeSnippets[activeCodeLang] ||
                      currentDoc.content.codeSnippets.curl}
                  </code>
                </pre>
              </div>
            )}

            {/* Mintlify Request Parameters Table */}
            {currentDoc.content.parameters && currentDoc.content.parameters.length > 0 && (
              <div className="my-8">
                <h3 className="text-base font-bold text-zinc-900 mb-3">Request Parameters</h3>
                <div className="rounded-xl border border-zinc-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-50 border-b border-zinc-200 font-mono text-zinc-600">
                      <tr>
                        <th className="p-3">Field</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Requirement</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {currentDoc.content.parameters.map((param) => (
                        <tr key={param.name} className="hover:bg-zinc-50/50">
                          <td className="p-3 font-mono font-semibold text-zinc-900">{param.name}</td>
                          <td className="p-3 font-mono text-purple-700 font-medium">{param.type}</td>
                          <td className="p-3">
                            {param.required ? (
                              <span className="rounded-md bg-red-50 text-red-700 px-2 py-0.5 font-mono text-[10px] font-bold">
                                required
                              </span>
                            ) : (
                              <span className="text-zinc-400 font-mono text-[10px]">optional</span>
                            )}
                          </td>
                          <td className="p-3 text-zinc-600">{param.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mintlify Response Preview */}
            {currentDoc.content.responsePreview && (
              <div className="my-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-zinc-900">Response</h3>
                  <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    HTTP {currentDoc.content.responsePreview.status}
                  </span>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-sm">
                  <pre>
                    <code>{currentDoc.content.responsePreview.body}</code>
                  </pre>
                </div>
              </div>
            )}

            {/* Custom Content Sections / Steps */}
            {currentDoc.content.sections?.map((sec, i) => (
              <div key={i} className="my-8">
                <h2 className="text-xl font-bold text-zinc-900 mb-3 tracking-tight">
                  {sec.title}
                </h2>
                <p className="whitespace-pre-line leading-relaxed text-zinc-700 mb-4">
                  {sec.body}
                </p>
                {sec.steps && (
                  <div className="space-y-3 mt-4">
                    {sec.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 text-xs text-zinc-800 shadow-2xs"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <p className="leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Mintlify Related Docs Cards */}
            {currentDoc.content.relatedDocs && (
              <div className="mt-10 pt-6 border-t border-zinc-200">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold mb-4">
                  Next Steps & Related Topics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentDoc.content.relatedDocs.map((rel) => (
                    <button
                      key={rel.id}
                      onClick={() => selectDoc(rel.id)}
                      className="text-left rounded-xl border border-zinc-200 p-4 hover:border-emerald-500 hover:shadow-xs transition-all group bg-white"
                    >
                      <div className="flex items-center justify-between text-sm font-semibold text-zinc-900 group-hover:text-emerald-700">
                        <span>{rel.title}</span>
                        <Icon icon={ArrowRight01Icon} size={14} className="transition-transform group-hover:translate-x-1" />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{rel.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* BOTTOM PAGINATION: PREVIOUS / NEXT CARDS                     */}
          {/* ============================================================ */}
          <div className="mt-12 pt-6 border-t border-zinc-200 flex items-center justify-between gap-4">
            {prevDoc ? (
              <button
                onClick={() => selectDoc(prevDoc.id)}
                className="flex flex-col items-start rounded-xl border border-zinc-200 p-3.5 text-left hover:border-zinc-400 hover:bg-zinc-50 transition-all w-1/2 group"
              >
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1 group-hover:text-zinc-700">
                  <Icon icon={ArrowLeft01Icon} size={11} /> Previous
                </span>
                <span className="text-xs font-semibold text-zinc-800 mt-1 truncate max-w-full">
                  {prevDoc.title}
                </span>
              </button>
            ) : (
              <div className="w-1/2" />
            )}

            {nextDoc ? (
              <button
                onClick={() => selectDoc(nextDoc.id)}
                className="flex flex-col items-end rounded-xl border border-zinc-200 p-3.5 text-right hover:border-zinc-400 hover:bg-zinc-50 transition-all w-1/2 group"
              >
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1 group-hover:text-zinc-700">
                  Next <Icon icon={ArrowRight01Icon} size={11} />
                </span>
                <span className="text-xs font-semibold text-zinc-800 mt-1 truncate max-w-full">
                  {nextDoc.title}
                </span>
              </button>
            ) : (
              <div className="w-1/2" />
            )}
          </div>
        </main>

        {/* ============================================================ */}
        {/* RIGHT SIDEBAR: ON THIS PAGE (Mintlify Style)                 */}
        {/* ============================================================ */}
        <aside className="hidden xl:block w-60 shrink-0 py-8 pl-8 text-xs">
          <div className="sticky top-20 space-y-5">
            <div>
              <span className="font-bold text-[11px] uppercase tracking-wider text-zinc-400 font-mono">
                On this page
              </span>
              <ul className="mt-2 space-y-2 border-l border-zinc-200 pl-3 text-zinc-600">
                <li>
                  <a href="#overview" className="hover:text-zinc-950 transition-colors block">
                    Overview
                  </a>
                </li>
                {currentDoc.content.sections?.map((sec, idx) => (
                  <li key={idx}>
                    <span className="text-zinc-500 hover:text-zinc-950 transition-colors block cursor-pointer">
                      {sec.title}
                    </span>
                  </li>
                ))}
                {currentDoc.content.parameters && (
                  <li>
                    <span className="text-zinc-500 hover:text-zinc-950 transition-colors block cursor-pointer">
                      Request Parameters
                    </span>
                  </li>
                )}
                {currentDoc.content.responsePreview && (
                  <li>
                    <span className="text-zinc-500 hover:text-zinc-950 transition-colors block cursor-pointer">
                      Response Preview
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <span className="font-bold text-[11px] uppercase tracking-wider text-zinc-400 font-mono">
                Community & Help
              </span>
              <ul className="mt-2 space-y-2 text-zinc-600">
                <li>
                  <a
                    href="https://github.com/sultanxdev/zyvan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-zinc-950 transition-colors flex items-center gap-1.5"
                  >
                    <Icon icon={GithubIcon} size={13} />
                    <span>GitHub Issues</span>
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => selectDoc('resources-status')}
                    className="hover:text-zinc-950 transition-colors flex items-center gap-1.5"
                  >
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span>System Status</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-zinc-400 font-mono text-sm">Loading documentation...</div>}>
      <DocsContent />
    </Suspense>
  );
}
