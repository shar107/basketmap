import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ShoppingBasket,
  MapPin,
  Search,
  Plus,
  Minus,
  X,
  Check,
  ChevronDown,
  LoaderCircle,
  Map as MapIcon,
  List,
  Leaf,
  RefreshCw,
  Download,
  ShoppingBag,
  SlidersHorizontal,
  RotateCcw,
  CircleCheckBig,
  CircleMinus,
} from "lucide-react";
import {
  compareBasket,
  formatEuro,
  haversineKm,
  parisDate,
  selectObservation,
} from "./domain";
import type { BasketLine, CatalogItem, PriceObservation } from "./domain";
import {
  CITIES,
  EMPTY_MARKET,
  LYON,
  PRIORITY_CHAINS,
  fetchPrices,
  localDataset,
  mergeMarkets,
} from "./services/market";
import type { Market, Place } from "./services/market";
import { useWebTools } from "./services/webTools";
import { comparisonCSV, downloadFile } from "./services/export";
import {
  loadShoppingSession,
  persistShoppingSession,
  type ShoppingSession,
} from "./services/basketStorage";
import MapPanel from "./components/MapPanel";
import {
  bestSharedBasket,
  candidateCoverage,
  essentialType,
  productImageMap,
  searchScore,
  visibleAliases,
} from "./services/shopping";
import { appPath, relativeAppPath } from "./base";
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const shortDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
type AppView = "home" | "shop" | "results";
const viewPath = (view: AppView) =>
  appPath(view === "home" ? "/" : `/${view}`);
const viewFromPath = (): AppView => {
  const path = relativeAppPath().replace(/\/+$/, "") || "/";
  if (path === "/shop") return "shop";
  if (path === "/results") return "results";
  return "home";
};
function ChainWordmark({ chain }: { chain: string }) {
  const key=normalize(chain).replace(/[^a-z]/g,"");
  if(chain==="Carrefour")return <span className={`chain-wordmark brand-${key}`}><i className="carrefour-symbol" aria-hidden="true"/><b>Carrefour</b></span>;
  if(chain==="Auchan")return <span className={`chain-wordmark brand-${key}`}><i aria-hidden="true">A</i><b>Auchan</b></span>;
  if(chain==="Intermarché")return <span className={`chain-wordmark brand-${key}`}><b>Inter</b><strong>marché</strong></span>;
  if(chain==="Monoprix")return <span className={`chain-wordmark brand-${key}`}><b>MONOPRIX</b></span>;
  if(chain==="Lidl")return <span className={`chain-wordmark brand-${key}`}><i className="lidl-symbol" aria-hidden="true">L<span>IDL</span></i><b>Lidl</b></span>;
  if(chain==="E.Leclerc")return <span className={`chain-wordmark brand-${key}`}><i aria-hidden="true">E</i><b>Leclerc</b></span>;
  return <span className={`chain-wordmark brand-${key}`}><i className="aldi-symbol" aria-hidden="true">A</i><b>ALDI</b></span>;
}
function ProductImage({
  item,
  images,
}: {
  item: CatalogItem;
  images: string[];
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [images]);
  const image = images[index];
  return image ? (
    <img
      src={image}
      alt={item.name}
      loading="lazy"
      onError={() => setIndex((current) => current + 1)}
    />
  ) : (
    <div className="product-photo-loading" aria-label={`Loading ${item.name}`}>
      <span>{essentialType(item) || item.category}</span>
    </div>
  );
}
export default function App() {
  const [saved] = useState(loadShoppingSession);
  const [market, setMarket] = useState<Market>(EMPTY_MARKET);
  const [kept, setKept] = useState<CatalogItem[]>(saved.session.items);
  const [basket, setBasket] = useState<BasketLine[]>(saved.session.basket);
  const [place, setPlace] = useState<Place>(
      CITIES.find((city) => city.label === saved.session.placeLabel) || LYON,
    ),
    [radius, setRadius] = useState<number>(saved.session.radius);
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All products"),
    [limit, setLimit] = useState(12);
  const [view, setView] = useState<AppView>(viewFromPath),
    [mapView, setMapView] = useState(false);
  const [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [notice, setNotice] = useState(saved.warning),
    [limited, setLimited] = useState(false);
  const [snapshotFailed, setSnapshotFailed] = useState(false),
    [asOf, setAsOf] = useState(parisDate());
  const [locationOpen, setLocationOpen] = useState(false),
    [basketOpen, setBasketOpen] = useState(false),
    [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [browseStore,setBrowseStore]=useState<string|null>(null);
  const [showPartial,setShowPartial]=useState(false);
  const [newBasketOpen,setNewBasketOpen]=useState(false);
  const newBasketDialog=useRef<HTMLDialogElement>(null);
  const locationDialog = useRef<HTMLDialogElement>(null),
    detailDialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const settings = useMemo(
    () => ({
      origin: place,
      radiusKm: radius,
      asOfDate: asOf,
      maxObservationAgeDays: 30,
    }),
    [place, radius, asOf],
  );
  const dataset = useMemo(
    () => localDataset(market, place, radius, kept, asOf),
    [market, place, radius, kept, asOf],
  );
  const productImages = useMemo(
    () => productImageMap(dataset, market.images),
    [dataset, market.images],
  );
  const imagesFor = (item: CatalogItem) => productImages.get(item.id) || [];
  const offers = useMemo(() => {
    const map = new Map<string, PriceObservation[]>();
    const groups = new Map<string, PriceObservation[]>();
    dataset.observations.forEach((o) => {
      const key = `${o.itemId}:${o.storeId}`;
      groups.set(key, [...(groups.get(key) || []), o]);
    });
    const items = new Map(dataset.items.map((i) => [i.id, i])),
      stores = new Map(dataset.stores.map((s) => [s.id, s]));
    groups.forEach((rows) => {
      const o = rows[0],
        item = items.get(o.itemId),
        store = stores.get(o.storeId);
      if (!item || !store) return;
      const result = selectObservation(
        item,
        store,
        { ...dataset, observations: rows },
        settings,
      );
      if (result.observation)
        map.set(item.id, [...(map.get(item.id) || []), result.observation]);
    });
    return map;
  }, [dataset, settings]);
  const fullComparisons=useMemo(()=>compareBasket(dataset,basket,settings),[dataset,basket,settings]);
  const wholeStoreCount=fullComparisons.filter(c=>c.status==='complete').length;
  const sharedMatch=useMemo(()=>bestSharedBasket(basket,offers),[basket,offers]);
  const sharedIds=sharedMatch.itemIds;
  const isSharedComparison=wholeStoreCount<2&&sharedIds.length>0&&sharedIds.length<basket.length;
  const comparisonBasket=useMemo(()=>isSharedComparison?basket.filter(b=>sharedIds.includes(b.itemId)):basket,[basket,isSharedComparison,sharedIds]);
  const comparisons = useMemo(
    () => compareBasket(dataset, comparisonBasket, settings),
    [dataset, comparisonBasket, settings],
  );
  useWebTools(dataset, basket, comparisons, (lines) => {
    setKept(
      dataset.items.filter((i) => lines.some((l) => l.itemId === i.id)),
    );
    setBasket(lines);
  });
  const excludedBasketLines=useMemo(()=>isSharedComparison?basket.filter(line=>!sharedIds.includes(line.itemId)):[],[basket,isSharedComparison,sharedIds]);
  const availabilityByItem=useMemo(()=>new Map(basket.map(line=>{
    const labels=[...new Set((offers.get(line.itemId)||[]).map(observation=>{
      const store=dataset.stores.find(candidate=>candidate.id===observation.storeId);
      return store?.chain||store?.name;
    }).filter((label):label is string=>Boolean(label)))];
    return [line.itemId,labels] as const;
  })),[basket,dataset.stores,offers]);
  const additionCoverage=useMemo(()=>new Map(dataset.items.map(i=>[i.id,candidateCoverage(i.id,basket,offers)])),[dataset.items,basket,offers]);
  const catalog=useMemo(()=>dataset.items.filter(i=>offers.has(i.id)).sort((a,b)=>Number(!!essentialType(b))-Number(!!essentialType(a))||(offers.get(b.id)?.length||0)-(offers.get(a.id)?.length||0)||a.name.localeCompare(b.name)),[dataset,offers]);
  const heroProducts=catalog.filter(item=>imagesFor(item).length>0).slice(0,3);
  const filtered=catalog.filter(i=>(category==='All products'||i.category===category)&&searchScore(i,search)>0&&(!browseStore||offers.get(i.id)?.some(o=>o.storeId===browseStore)));
  const complete = comparisons
    .filter((c) => c.status === "complete")
    .sort(
      (a, b) =>
        a.completeTotalCents! - b.completeTotalCents! ||
        a.distanceKm - b.distanceKm,
    );
  const partial = comparisons
    .filter((c) => c.status === "incomplete" && c.matchedLineCount > 0)
    .sort(
      (a, b) =>
        b.matchedLineCount - a.matchedLineCount || a.distanceKm - b.distanceKm,
    );
  const hasStoreComparison=complete.length>=2;
  const comparedBasketLines=hasStoreComparison?comparisonBasket:[];
  const notComparedBasketLines=hasStoreComparison?excludedBasketLines:basket;
  const comparedItemIds=new Set(comparedBasketLines.map(line=>line.itemId));
  const comparisonShown=view==="results";
  const results = [...complete, ...(showPartial?partial:[])];
  const selected = comparisons.find((c) => c.storeId === selectedId),
    selectedStore = dataset.stores.find((s) => s.id === selectedId);
  const unitCount = basket.reduce((n, b) => n + b.quantity, 0);
  const pricedStores = new Set(dataset.observations.map((o) => o.storeId));
  const categories = [
    "All products",
    ...new Set(catalog.map((i) => i.category)),
  ];
  const priceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    offers.forEach((rows, itemId) => {
      if (itemId.startsWith("essential:")) return;
      rows.forEach(
        (observation) =>
          (counts[observation.storeId] =
            (counts[observation.storeId] || 0) + 1),
      );
    });
    return counts;
  }, [offers]);
  const discoveryComparisons = useMemo(
    () =>
      compareBasket(dataset, [], settings)
        .filter((comparison) => priceCounts[comparison.storeId] > 0)
        .sort(
          (left, right) =>
            priceCounts[right.storeId] - priceCounts[left.storeId] ||
            left.distanceKm - right.distanceKm,
        ),
    [dataset, settings, priceCounts],
  );
  const chainCards=useMemo(()=>{
    const summaries=new Map<string,{branchCount:number;productCount:number;storeId:string|null}>();
    discoveryComparisons.forEach(comparison=>{
      const store=dataset.stores.find(candidate=>candidate.id===comparison.storeId);
      if(!store?.chain)return;
      const current=summaries.get(store.chain)||{branchCount:0,productCount:0,storeId:null};
      summaries.set(store.chain,{
        branchCount:current.branchCount+1,
        productCount:current.productCount+(priceCounts[store.id]||0),
        storeId:current.storeId||store.id,
      });
    });
    return PRIORITY_CHAINS.map(chain=>({
      chain,
      ...(summaries.get(chain)||{branchCount:0,productCount:0,storeId:null}),
    }));
  },[dataset.stores,discoveryComparisons,priceCounts]);
  async function refresh(codes: string[] = []) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setRefreshing(true);
    setNotice("");
    try {
      const result = await fetchPrices(place, radius, controller.signal, codes);
      if (controller.signal.aborted) return;
      setMarket((m) => mergeMarkets(m, result.market));
      setLimited(result.limited);
      setNotice(
        result.market.observations.length
          ? ""
          : "No additional recent prices found in this area.",
      );
    } catch {
      if (!controller.signal.aborted)
        setNotice(
          "Live refresh is unavailable. Showing saved observations where available.",
        );
    } finally {
      if (!controller.signal.aborted) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch(appPath("/data/france-market.json"), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data: Market) => {
        setMarket((m) => mergeMarkets(data, m));
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSnapshotFailed(true);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    void refresh();
    setCategory("All products");
    setLimit(12);
    return () => request.current?.abort();
  }, [place, radius]);
  useEffect(() => {
    const timer = setInterval(() => setAsOf(parisDate()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const handlePopState = () => {
      setView(viewFromPath());
      setBasketOpen(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => {
    document.title =
      view === "home"
        ? "BasketMap — A smarter everyday shop"
        : view === "shop"
          ? "Build your basket — BasketMap"
          : "Compare your basket — BasketMap";
  }, [view]);
  useEffect(() => {
    const session: ShoppingSession = {
      basket,
      items: kept,
      placeLabel: place.label as ShoppingSession["placeLabel"],
      radius: radius as ShoppingSession["radius"],
    };
    if (!persistShoppingSession(session))
      setNotice("Your browser could not save this basket. Keep this tab open.");
  }, [basket, kept, place.label, radius]);
  useEffect(() => {
    if (locationOpen) locationDialog.current?.showModal();
    else locationDialog.current?.close();
  }, [locationOpen]);
  useEffect(() => {
    if (selectedId) detailDialog.current?.showModal();
    else detailDialog.current?.close();
  }, [selectedId]);
  useEffect(()=>{if(newBasketOpen)newBasketDialog.current?.showModal();else newBasketDialog.current?.close();},[newBasketOpen]);
  useEffect(() => {
    setLimit(12);
  }, [category, search]);
  function quantity(item: CatalogItem, delta: number) {
    setShowPartial(false);
    if (
      delta > 0 &&
      !basket.some((b) => b.itemId === item.id) &&
      basket.length >= 40
    ) {
      setNotice("Your basket can contain up to 40 different products.");
      return;
    }
    setKept((items) =>
      items.some((i) => i.id === item.id)
        ? items
        : [...items, item].filter(
            (i) => basket.some((b) => b.itemId === i.id) || i.id === item.id,
          ),
    );
    setBasket((lines) => {
      const found = lines.find((l) => l.itemId === item.id);
      if (!found)
        return delta > 0 ? [...lines, { itemId: item.id, quantity: 1 }] : lines;
      return lines
        .map((l) =>
          l.itemId === item.id
            ? { ...l, quantity: Math.min(20, l.quantity + delta) }
            : l,
        )
        .filter((l) => l.quantity > 0);
    });
  }
  function choosePlace(p: Place) {
    setPlace(p);
    setLocationOpen(false);
    setBrowseStore(null);setSearch("");setShowPartial(false);
    setSelectedId(null);
  }
  function navigate(next: AppView, replace = false) {
    const path = viewPath(next);
    if (window.location.pathname !== path) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    }
    setView(next);
    setBasketOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function startNewBasket() {
    setBasket([]);
    setKept([]);
    setShowPartial(false);
    setSelectedId(null);
    setBasketOpen(false);
    setNewBasketOpen(false);
    setSearch("");
    setCategory("All products");
    setBrowseStore(null);
    setNotice(
      "New basket ready. Your previous basket was cleared from this device.",
    );
    navigate("shop");
  }
  function requestNewBasket() {
    if (basket.length) setNewBasketOpen(true);
    else startNewBasket();
  }
  function compare() {
    setShowPartial(false);
    navigate("results");
    void refresh(basket.map((b) => b.itemId));
  }
  const stepper = (item: CatalogItem) => {
    const count = basket.find((b) => b.itemId === item.id)?.quantity || 0;
    return count ? (
      <div className="stepper">
        <button
          aria-label={`Remove one ${item.name}`}
          onClick={() => quantity(item, -1)}
        >
          <Minus size={14} />
        </button>
        <span aria-label={`${count} packs`}>{count}</span>
        <button
          aria-label={`Add one ${item.name}`}
          disabled={count >= 20}
          onClick={() => quantity(item, 1)}
        >
          <Plus size={14} />
        </button>
      </div>
    ) : (
      <button
        className="add-product"
        aria-label={`Add ${item.name}`}
        onClick={() => quantity(item, 1)}
      >
        <Plus size={18} />
      </button>
    );
  };
  const basketContents = (
    <>
      <div className="basket-heading">
        <div>
          <span className="eyebrow">YOUR SHOPPING LIST</span>
          <h2>
            My basket <span>{unitCount}</span>
          </h2>
        </div>
        <div className="basket-heading-actions">
          {basket.length > 0 && (
            <button type="button" onClick={() => setNewBasketOpen(true)}>
              <RotateCcw size={14} />
              New
            </button>
          )}
          <ShoppingBasket size={28} />
        </div>
      </div>
      {!basket.length ? (
        <div className="empty-basket">
          <div className="empty-icon">
            <ShoppingBag size={32} strokeWidth={1.25} />
          </div>
          <h3>
            A little planning.
            <br />A better shop.
          </h3>
          <p>Add your first product to start comparing your basket.</p>
        </div>
      ) : (
        <div className="basket-lines">
          {basket.map((line) => {
            const item = dataset.items.find((i) => i.id === line.itemId)!;
            const lineIsCompared=comparisonShown&&comparedItemIds.has(line.itemId);
            return (
              <div className="basket-line" key={line.itemId}>
                <div className="basket-thumb">
                  <ProductImage item={item} images={imagesFor(item)} />
                </div>
                <div className="basket-item">
                  <h3>{item.name}</h3>
                  <p>{item.packLabel}</p>
                  {stepper(item)}
                </div>
                {comparisonShown&&(
                  <span
                    className={`basket-line-status ${lineIsCompared?"compared":"not-compared"}`}
                    aria-label={lineIsCompared?"Included in comparison":"Not included in comparison"}
                    title={lineIsCompared?"Included in comparison":"Not included in comparison"}
                  >
                    {lineIsCompared?<CircleCheckBig size={16}/>:<CircleMinus size={16}/>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {basket.length > 0 && (
        <div
          className={`basket-coverage ${wholeStoreCount < 2 ? "needs-attention" : ""}`}
          role="status"
        >
          {hasStoreComparison?<CircleCheckBig size={19}/>:<CircleMinus size={19}/>}
          <div>
            <strong>
              {wholeStoreCount >= 2
                ? `${basket.length} compared · 0 not compared`
                : isSharedComparison
                  ? `${sharedIds.length} compared · ${excludedBasketLines.length} not compared`
                  : "No multi-store comparison yet"}
            </strong>
            <span>
              {wholeStoreCount >= 2
                ? `${wholeStoreCount} stores price the full basket`
                : isSharedComparison
                  ? `${complete.length} stores share the compared products`
                  : wholeStoreCount === 1
                    ? "One store prices the full basket"
                    : "Recent prices do not overlap across two stores"}
            </span>
          </div>
        </div>
      )}
      <div className="basket-bottom">
        <div className="basket-summary">
          <span>
            {basket.length} product{basket.length === 1 ? "" : "s"}
          </span>
          <span>
            {unitCount} pack{unitCount === 1 ? "" : "s"}
          </span>
        </div>
        <button
          className="primary compare-button"
          disabled={!basket.length||comparisonShown}
          onClick={()=>compare()}
        >
          {comparisonShown?<><CircleCheckBig size={18}/> Comparison shown</>:<>Compare my basket <ArrowRight size={18}/></>}
        </button>
        <p>
          <Check size={11} /> Saved on this device · resume when you return
        </p>
      </div>
    </>
  );
  return (
    <>
      <a
        className="skip-link"
        href={view === "home" ? "#home-content" : "#products"}
      >
        Skip to {view === "home" ? "content" : "shopping"}
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a
            href={viewPath("home")}
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              navigate("home");
            }}
            aria-label="BasketMap home"
          >
            <span className="brand-icon">
              <ShoppingBasket size={24} />
            </span>
            basket<span>map</span>
            <i />
          </a>
          <span className="header-note">
            Compare grocery totals across nearby supermarkets.
          </span>
          <div className="header-actions">
            <button
              className="new-basket-button"
              onClick={requestNewBasket}
              aria-label="Start a new basket"
            >
              <RotateCcw size={16} />
              <span>New basket</span>
            </button>
            <button
              className="location-button"
              onClick={() => setLocationOpen(true)}
            >
              <MapPin size={17} />
              <span>{place.label}</span>
              <ChevronDown size={14} />
            </button>
            <button
              className="mobile-basket"
              aria-label={`Open basket, ${unitCount} ${unitCount === 1 ? "pack" : "packs"}`}
              onClick={() => {
                if (view === "home") navigate("shop");
                setBasketOpen(true);
              }}
            >
              <ShoppingBasket size={20} />
              <span>{unitCount}</span>
            </button>
          </div>
        </div>
      </header>
      <main id={view === "home" ? "home" : "shop"}>
        {view === "home" ? (
          <>
            <section className="hero purpose-hero" id="home-content">
              <div className="hero-copy">
                <span className="eyebrow">
                  GROCERY PRICE COMPARISON
                </span>
                <h1>
                  Build your basket.
                  <br />
                  <em>Compare your total.</em>
                  <br />
                  Choose where to shop.
                </h1>
                <p>
                  Build one shopping list and compare the products nearby
                  supermarkets have in common. Store-specific products stay
                  visible and are listed separately.
                </p>
                <a
                  className="primary hero-link"
                  href={viewPath("shop")}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate("shop");
                  }}
                >
                  Start your shopping list <ArrowRight size={18} />
                </a>
                <span className="hero-freshness">
                  Observed prices from the last 30 days. Coverage and
                  availability vary by store.
                </span>
              </div>
              <div className="hero-stage">
                <div className="hero-still-life" aria-label="Featured grocery products">
                  <span className="hero-spark hero-spark-one" aria-hidden="true">✦</span>
                  <span className="hero-spark hero-spark-two" aria-hidden="true">✦</span>
                  {heroProducts.map((item,index)=><figure className={`hero-frame hero-frame-${index}`} key={item.id}>
                    <ProductImage item={item} images={imagesFor(item)}/>
                    <figcaption>{item.name}</figcaption>
                  </figure>)}
                  <div className="hero-stage-copy">
                    <span>REAL PRODUCTS</span>
                    <em>honest totals</em>
                  </div>
                </div>
                <div className="how-it-works">
                  <span className="eyebrow">HOW BASKETMAP WORKS</span>
                  <div>
                    <b>01</b>
                    <span>
                      <strong>Choose your area</strong>
                      <p>Browse recent price records around Lyon or Paris.</p>
                    </span>
                  </div>
                  <div>
                    <b>02</b>
                    <span>
                      <strong>Build your basket</strong>
                      <p>Add any recorded product to your shopping list.</p>
                    </span>
                  </div>
                  <div>
                    <b>03</b>
                    <span>
                      <strong>Compare shared totals</strong>
                      <p>See honest totals for the products stores share.</p>
                    </span>
                  </div>
                </div>
              </div>
            </section>
            <section
              className="homepage-map"
              aria-label="Explore local supermarkets"
            >
              <div className="map-intro">
                <div>
                  <span className="eyebrow">SUPERMARKETS WITH RECENT PRICES</span>
                  <h2>Explore {place.label}.</h2>
                  <p>
                    Choose a supermarket brand or select a map marker.
                  </p>
                </div>
                <div className="city-toggle" aria-label="Choose a city">
                  {CITIES.map((city) => (
                    <button
                      key={city.label}
                      aria-pressed={city.label === place.label}
                      onClick={() => choosePlace(city)}
                    >
                      {city.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="store-explorer">
                <aside className="chain-showcase" aria-label={`Supermarket brands covered near ${place.label}`}>
                  <div className="chain-showcase-heading">
                    <div>
                      <h3>Supermarkets we cover</h3>
                      <p>{discoveryComparisons.length} priced branches near {place.label}</p>
                    </div>
                  </div>
                  <div className="chain-brand-grid">
                    {chainCards.map(card=>{
                      const active=Boolean(card.storeId);
                      return <button
                        key={card.chain}
                        className={`chain-brand-card ${active?"active":"unavailable"}`}
                        disabled={!active}
                        onClick={()=>card.storeId&&setSelectedId(card.storeId)}
                        aria-label={active?`${card.chain}, ${card.branchCount} priced ${card.branchCount===1?"branch":"branches"}`:`${card.chain}, no recent price data`}
                      >
                        <ChainWordmark chain={card.chain}/>
                        <small>{active?`${card.branchCount} ${card.branchCount===1?"branch":"branches"}`:"No recent price data"}</small>
                      </button>;
                    })}
                  </div>
                </aside>
                <div className="homepage-map-canvas">
                  <MapPanel
                    stores={dataset.stores}
                    comparisons={discoveryComparisons}
                    origin={place}
                    selectedStoreId={selectedId}
                    onSelect={setSelectedId}
                    priceCounts={priceCounts}
                  />
                </div>
              </div>
            </section>
          </>
        ) : view === "results" ? (
          <section className="results-intro">
            <button className="text-button" onClick={() => navigate("shop")}>
              <ArrowLeft size={16} /> Keep shopping
            </button>
            <h1>
              Your basket.
              <br className="mobile-only" /> <em>Your options.</em>
            </h1>
            <p>
              {basket.length} {basket.length === 1 ? "product" : "products"} · {unitCount} {unitCount === 1 ? "pack" : "packs"} · Around{" "}
              {place.label}
            </p>
          </section>
        ) : null}
        {view !== "home" && <div className="shopping-layout">
          <section className="shopping-main" id="products" ref={resultsRef}>
            <div className="section-top">
              <div>
                <span className="eyebrow">
                  {view === "shop" ? "MAKE IT YOURS" : "FIND YOUR NEXT STOP"}
                </span>
                <h2>
                  {view === "shop"
                    ? "What’s on your list?"
                    : "Compare your stores"}
                </h2>
              </div>
              <button
                className="icon-label"
                onClick={() => setFiltersOpen(!filtersOpen)}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal size={17} />
                <span>{radius} km</span>
                <ChevronDown size={13} />
              </button>
            </div>
            {filtersOpen && (
              <div className="filter-panel">
                <label>
                  Search radius{" "}
                  <select
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                  >
                    <option value={3}>3 km</option>
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={15}>15 km</option>
                    <option value={30}>30 km</option>
                  </select>
                </label>
                <span>
                  Distances are straight-line. Prices observed in the last 30
                  days.
                </span>
              </div>
            )}
            <div className="coverage-line">
              <span className={refreshing ? "" : "green-dot"} />
              {refreshing ? (
                <>
                  <LoaderCircle size={13} className="spin" /> Checking recent
                  prices…
                </>
              ) : (
                <>
                  {pricedStores.size} stores with recent prices near{" "}
                  {place.label}
                </>
              )}
              <button
                aria-label="Refresh prices"
                title="Refresh prices"
                disabled={refreshing}
                onClick={() =>
                  void refresh(
                    view === "results" ? basket.map((b) => b.itemId) : [],
                  )
                }
              >
                <RefreshCw size={13} />
              </button>
            </div>
            {notice && (
              <p className="service-notice" role="status">
                {notice}
              </p>
            )}
            {limited && (
              <p className="service-notice">
                Showing a selection of recent observations. Compare your basket
                to check its exact products.
              </p>
            )}
            {view === "shop" ? (
              <>
                <div className="search-field">
                  <Search size={21} />
                  <input
                    aria-label="Search products"
                    placeholder="Search recorded products or enter a barcode"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      aria-label="Clear search"
                      onClick={() => setSearch("")}
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>
                <p className="catalog-explanation">
                  Search the products that have recent prices near {place.label}.
                  If stores do not share every item, BasketMap compares the
                  largest shared part of your basket and lists store-specific
                  products separately.
                </p>
                {browseStore && (
                  <div className="service-notice store-filter-notice">
                    Products at{" "}
                    {dataset.stores.find((store) => store.id === browseStore)
                      ?.name}
                    <button onClick={() => setBrowseStore(null)}>
                      Clear store filter ×
                    </button>
                  </div>
                )}
                <div className="category-tabs" aria-label="Product categories">
                  {categories.map((c) => (
                    <button
                      key={c}
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {loading ? (
                  <div className="loading-grid" aria-label="Loading products">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} />
                    ))}
                  </div>
                ) : filtered.length ? (
                  <>
                    <div className="product-grid">
                      {filtered.slice(0, limit).map((item) => {
                        const prices = offers.get(item.id)!;
                        const min = Math.min(
                          ...prices.map((p) => p.priceCents),
                        );
                        const cheapest = prices.find(
                          (p) => p.priceCents === min,
                        )!;
                        return (
                          <article
                            className={`product-card ${item.id.startsWith("essential:") ? "comparable-product" : ""}`}
                            data-item-id={item.id}
                            key={item.id}
                          >
                            <div className="product-picture">
                              <ProductImage
                                item={item}
                                images={imagesFor(item)}
                              />
                              {prices.length > 1 && (
                                <span className="availability-tag">
                                  {prices.length} stores
                                </span>
                              )}
                            </div>
                            <div className="product-copy">
                              <span className="product-brand">
                                {visibleAliases(item)[0] || item.category}
                              </span>
                              <h3>{item.name}</h3>
                              <p className="pack-label">{item.packLabel}</p>
                              <div className="product-price-row">
                                <div>
                                  <span className="from-label">
                                    {prices.length > 1
                                      ? "From"
                                      : "Observed price"}
                                  </span>
                                  <strong>{formatEuro(min)}</strong>
                                </div>
                                {stepper(item)}
                              </div>
                              <p
                                className={`product-coverage ${(additionCoverage.get(item.id) || 0) < 2 ? "limited" : ""}`}
                              >
                                {(additionCoverage.get(item.id) || 0) >= 2
                                  ? `Shared with your basket at ${additionCoverage.get(item.id)} stores`
                                  : prices.length === 1
                                    ? "Recorded at one store · listed separately when needed"
                                    : `Recorded at ${prices.length} stores · shared totals update automatically`}
                              </p>
                              <div className="observed-date">
                                Seen {shortDate(cheapest.observedOn!)} ·{" "}
                                {
                                  dataset.stores.find(
                                    (s) => s.id === cheapest.storeId,
                                  )?.chain
                                }
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    {filtered.length > limit && (
                      <button
                        className="load-more"
                        onClick={() => setLimit((n) => n + 12)}
                      >
                        Show more products <ChevronDown size={16} />
                      </button>
                    )}
                    <p className="product-count">
                      {Math.min(limit, filtered.length)} of {filtered.length}{" "}
                      products with recent prices
                    </p>
                  </>
                ) : (
                  <div className="empty-state">
                    <Search size={28} />
                    <h3>
                      {search
                        ? "No matching product prices yet"
                        : "No recent prices in this area yet"}
                    </h3>
                    <p>
                      {search
                        ? "We have no recent local price for that product. Try its French or English name, or browse recorded products. Prices are never filled in with unrelated matches."
                        : "You can review your basket, explore all recorded products, or change between Lyon and Paris. Your saved list will stay intact."}
                    </p>
                    <button
                      className="secondary"
                      onClick={() =>
                        search ? setSearch("") : setLocationOpen(true)
                      }
                    >
                      {search ? "Clear search" : "Change location"}
                    </button>
                    {catalog.length>0&&<button className="secondary" onClick={()=>setSearch("")}>Browse all recorded products</button>}
                    {snapshotFailed && (
                      <p>Saved prices could not be loaded. Try refreshing.</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {!basket.length ? (
                  <div className="empty-state">
                    <ShoppingBasket size={32} />
                    <h3>Your basket is empty</h3>
                    <button className="primary" onClick={() => navigate("shop")}>
                      Find products <ArrowRight size={17} />
                    </button>
                  </div>
                ) : (
                  <>
                    <section className="comparison-overview" aria-label="Products included in this comparison">
                      <div className="comparison-product-group compared">
                        <div className="comparison-group-heading">
                          <span><CircleCheckBig size={20}/></span>
                          <div>
                            <h3>Compared <b>{comparedBasketLines.length}</b></h3>
                            <small>Included in every total below</small>
                          </div>
                        </div>
                        <div className="comparison-product-list">
                          {comparedBasketLines.length?comparedBasketLines.map(line=>{
                            const item=dataset.items.find(candidate=>candidate.id===line.itemId)!;
                            return <article className="comparison-product" key={line.itemId}>
                              <div className="comparison-product-thumb"><ProductImage item={item} images={imagesFor(item)}/></div>
                              <div><strong>{item.name}</strong><small>{line.quantity} × {item.packLabel}</small></div>
                              <CircleCheckBig size={17}/>
                            </article>;
                          }):<p className="comparison-empty">No products can be compared across two stores yet.</p>}
                        </div>
                      </div>
                      {notComparedBasketLines.length>0&&<div className="comparison-product-group not-compared">
                        <div className="comparison-group-heading">
                          <span><CircleMinus size={20}/></span>
                          <div>
                            <h3>Not compared <b>{notComparedBasketLines.length}</b></h3>
                            <small>Not included in store totals</small>
                          </div>
                        </div>
                        <div className="comparison-product-list">
                          {notComparedBasketLines.map(line=>{
                            const item=dataset.items.find(candidate=>candidate.id===line.itemId)!;
                            const labels=availabilityByItem.get(line.itemId)||[];
                            return <article className="comparison-product" key={line.itemId}>
                              <div className="comparison-product-thumb"><ProductImage item={item} images={imagesFor(item)}/></div>
                              <div>
                                <strong>{item.name}</strong>
                                <small>{labels.length===1?`Only at ${labels[0]}`:labels.length>1?"Not available at the same stores":"No recent local price"}</small>
                              </div>
                              <CircleMinus size={17}/>
                            </article>;
                          })}
                        </div>
                      </div>}
                    </section>
                    <div className="results-toolbar">
                      <span>
                        {hasStoreComparison
                          ? `${complete.length} stores compared`
                          : complete.length
                          ? "1 complete store price"
                          : "Store availability"}
                      </span>
                      <div className="view-switch">
                        <button
                          aria-pressed={!mapView}
                          onClick={() => setMapView(false)}
                          aria-label="List view"
                        >
                          <List size={17} />
                        </button>
                        <button
                          aria-pressed={mapView}
                          onClick={() => setMapView(true)}
                          aria-label="Map view"
                        >
                          <MapIcon size={17} />
                        </button>
                      </div>
                    </div>
                    {!isSharedComparison&&complete.length<2&&<div className="coverage-message"><ShoppingBag size={22}/><div><h3>{complete.length===1?'Only one store can price every item.':'No shared total across two stores yet.'}</h3><p>{basket.length} products are saved in your list. {partial.length?`The best store currently prices ${partial[0].matchedLineCount} of ${comparisonBasket.length}.`:"There aren’t enough recent matching prices to calculate a fair store-to-store total."}</p><div className="recovery-actions"><button className="primary" onClick={()=>{navigate('shop');setBasketOpen(true);}}>Edit my basket</button><button className="text-button" onClick={()=>setLocationOpen(true)}>Change city</button></div></div></div>}
                    {!isSharedComparison&&partial.length>0&&<button className="partial-toggle" aria-expanded={showPartial} onClick={()=>setShowPartial(!showPartial)}>{showPartial?'Hide':'View'} store-by-store availability ({partial.length} stores) <ChevronDown size={14}/></button>}
                    {mapView ? (
                      <MapPanel
                        stores={dataset.stores.filter((s) =>
                          results.some((c) => c.storeId === s.id),
                        )}
                        comparisons={results}
                        origin={place}
                        selectedStoreId={selectedId}
                        onSelect={setSelectedId}
                      />
                    ) : (
                      <div className="store-results">
                        {results.slice(0, 30).map((comparison, index) => {
                          const store = dataset.stores.find(
                            (s) => s.id === comparison.storeId,
                          )!;
                          const isComplete = comparison.status === "complete";
                          return (
                            <article
                              className={`store-card ${index === 0 && isComplete ? "best-store" : ""}`}
                              key={store.id}
                            >
                              {index === 0 && isComplete && (
                                <div className="best-label">
                                  <Check size={14} />
                                  {complete.length > 1
                                    ? isSharedComparison ? "Lowest total for shared products" : "Lowest complete basket in these results"
                                    : "One complete price · comparison unavailable"}
                                </div>
                              )}
                              <div className="store-card-main">
                                <div
                                  className={`store-monogram chain-${normalize(store.chain || "").replace(/[^a-z]/g, "")}`}
                                >
                                  {(store.chain || store.name).slice(0, 1)}
                                </div>
                                <div className="store-information">
                                  <h3>{store.name}</h3>
                                  <p>
                                    {store.address
                                      ?.split(",")
                                      .slice(1, 4)
                                      .join(",")
                                      .trim()}
                                  </p>
                                  <span>
                                    <MapPin size={12} />
                                    {comparison.distanceKm.toFixed(1)} km away ·{" "}
                                    {comparison.matchedLineCount}/
                                    {comparisonBasket.length} products priced
                                  </span>
                                </div>
                                <div className="store-total">
                                  <strong>
                                    {formatEuro(
                                      isComplete
                                        ? comparison.completeTotalCents!
                                        : comparison.knownSubtotalCents,
                                    )}
                                  </strong>
                                  <span>
                                    {isComplete
                                      ? isSharedComparison ? "Shared products total" : "Full basket"
                                      : `${comparison.matchedLineCount} of ${comparisonBasket.length} only`}
                                  </span>
                                </div>
                              </div>
                              <div className="store-card-bottom">
                                <span>
                                  Observed{" "}
                                  {comparison.oldestObservationDate &&
                                    shortDate(comparison.oldestObservationDate)}
                                  {comparison.newestObservationDate !==
                                    comparison.oldestObservationDate &&
                                  comparison.newestObservationDate
                                    ? ` – ${shortDate(comparison.newestObservationDate)}`
                                    : ""}
                                </span>
                                <button onClick={() => setSelectedId(store.id)}>
                                  View basket <ArrowRight size={15} />
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                    {results.length > 30 && !mapView && (
                      <p className="service-notice">
                        Showing the first 30 stores, sorted by complete total,
                        then price coverage.
                      </p>
                    )}
                    <p className="results-footnote">
                      Observed prices can change. Stock may vary.
                    </p>
                    {results.length > 0 && (
                      <button
                        className="text-button export"
                        onClick={() =>
                          downloadFile(
                            comparisonCSV(dataset, comparisons, settings),
                            "basketmap-prices.csv",
                            "text/csv",
                          )
                        }
                      >
                        <Download size={15} /> Download comparison
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </section>
          <aside
            className={`basket-panel ${basketOpen ? "mobile-open" : ""}`}
            aria-label="Shopping basket"
          >
            <button
              className="close-mobile-basket"
              aria-label="Close basket"
              onClick={() => setBasketOpen(false)}
            >
              <X size={20} />
            </button>
            {basketContents}
          </aside>
          {basketOpen && (
            <button
              className="basket-backdrop"
              aria-label="Close basket overlay"
              onClick={() => setBasketOpen(false)}
            />
          )}
        </div>}
        <section className="closing-note">
          <div className="closing-leaf">
            <Leaf size={24} />
          </div>
          <p>
            A little more clarity.
            <br />
            <strong>Every time you shop.</strong>
          </p>
          <span>Exact products. Real stores. A basket that’s yours.</span>
        </section>
      </main>
      <footer>
        <div className="footer-signature">
          <a
            className="footer-brand"
            href={viewPath("home")}
            onClick={(event) => {
              event.preventDefault();
              navigate("home");
            }}
          >
            basketmap.
          </a>
          <span>
            Created by <strong>Sharad Adhikari</strong>
          </span>
        </div>
        <div className="footer-links">
          <a
            href="https://prices.openfoodfacts.org"
            target="_blank"
            rel="noreferrer"
          >
            Prices © Open Prices contributors
          </a>
          <a
            href="https://world.openfoodfacts.org/terms-of-use"
            target="_blank"
            rel="noreferrer"
          >
            Products & photos © Open Food Facts
          </a>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap
          </a>
          <a href={appPath("/licenses.txt")}>Licences</a>
        </div>
      </footer>
      <div
        className="mobile-basket-bar"
        hidden={view === "home" || !basket.length || basketOpen}
      >
        <button onClick={() => setBasketOpen(true)}>
          <ShoppingBasket size={19} />
          <span>{unitCount} {unitCount === 1 ? "pack" : "packs"}</span>
        </button>
        <button className="primary" disabled={comparisonShown} onClick={()=>compare()}>
          {comparisonShown?<><CircleCheckBig size={16}/> Comparison shown</>:<>Compare basket <ArrowRight size={16}/></>}
        </button>
      </div>
      <dialog
        ref={newBasketDialog}
        aria-labelledby="new-basket-title"
        onCancel={() => setNewBasketOpen(false)}
        onClose={() => setNewBasketOpen(false)}
      >
        <button
          className="dialog-close"
          aria-label="Keep current basket"
          onClick={() => setNewBasketOpen(false)}
        >
          <X size={20} />
        </button>
        <span className="eyebrow">START FRESH</span>
        <h2 id="new-basket-title">Create a new basket?</h2>
        <p>
          This clears {basket.length} saved{" "}
          {basket.length === 1 ? "product" : "products"} from this device. Your
          city and search radius will stay the same.
        </p>
        <button className="primary" onClick={startNewBasket}>
          <RotateCcw size={16} /> Start a new basket
        </button>
        <button className="secondary" onClick={() => setNewBasketOpen(false)}>
          Keep my current basket
        </button>
      </dialog>
      <dialog
        ref={locationDialog}
        onCancel={() => setLocationOpen(false)}
        onClose={() => setLocationOpen(false)}
        aria-labelledby="location-title"
      >
        <button
          className="dialog-close"
          aria-label="Close location"
          onClick={() => setLocationOpen(false)}
        >
          <X size={20} />
        </button>
        <span className="eyebrow">START LOCAL</span>
        <h2 id="location-title">Where do you shop?</h2>
        <p>Choose the city where you plan to shop.</p>
        <div className="city-list">
          {CITIES.map((city) => (
            <button key={city.label} onClick={() => choosePlace(city)}>
              <MapPin size={16} />
              {city.label}
              <ArrowRight size={15} />
            </button>
          ))}
        </div>
        <p className="location-note">
          Price coverage varies by store and product. Your basket stays saved
          when you switch cities.
        </p>
      </dialog>
      <dialog
        ref={detailDialog}
        className="detail-dialog"
        onCancel={() => setSelectedId(null)}
        onClose={() => setSelectedId(null)}
        aria-labelledby="detail-title"
      >
        <button
          className="dialog-close"
          aria-label="Close store details"
          onClick={() => setSelectedId(null)}
        >
          <X size={20} />
        </button>
        {selected && selectedStore && (
          <>
            <span className="eyebrow">YOUR BASKET AT</span>
            <h2 id="detail-title">{selectedStore.name}</h2>
            <p>{selectedStore.address}</p>
            {!basket.length?<><div className="store-discovery-summary"><strong>{priceCounts[selectedStore.id]||0}</strong><span>products with recent recorded prices</span></div><p className="catalog-explanation">A price record is not a stock check. Build your basket to see whether the same products can be compared across stores.</p><button className="primary" onClick={()=>{setBrowseStore(selectedStore.id);setSelectedId(null);navigate('shop');}}>Browse this store’s products <ArrowRight size={16}/></button></>:<>
            <div className="detail-total"><span>{selected.status==='complete'?(isSharedComparison?'Shared products total':'Full basket'):`${selected.matchedLineCount} of ${comparisonBasket.length} products priced`}</span><strong>{selected.matchedLineCount?formatEuro(selected.status==='complete'?selected.completeTotalCents!:selected.knownSubtotalCents):'Unavailable'}</strong></div>
            {isSharedComparison&&<p className="subset-notice">This total covers {comparisonBasket.length} shared {comparisonBasket.length === 1 ? "product" : "products"}. The other {excludedBasketLines.length} {excludedBasketLines.length === 1 ? "product is" : "products are"} listed separately in the comparison.</p>}
            {selected.status!=='complete'&&<div className="coverage-message"><div><h3>This is not a full basket price.</h3><p>{selected.missingItemIds.length} products have no recent price here. Your shopping list stays saved.</p><button className="primary" onClick={()=>{setSelectedId(null);navigate('shop');setBasketOpen(true);}}>Edit my basket</button></div></div>}
            <div className="detail-lines">{selected.lines.filter(l=>l.observation).map(line=><div key={line.itemId}><div><strong>{line.item.name}</strong><span>{line.observation!.productLabel}{line.item.id.startsWith("essential:") ? ` · ${line.item.packLabel}` : ` · ${line.quantity} × ${line.item.packLabel}`}</span><small>Observed {shortDate(line.observation!.observedOn!)} · <a href={line.observation!.source.recordUrl!} target="_blank" rel="noreferrer">Price record <ArrowUpRight size={10}/></a></small></div><b>{formatEuro(line.lineTotalCents!)}</b></div>)}</div>
            {selected.missingItemIds.length>0&&<details className="missing-products"><summary>{selected.missingItemIds.length} products without recent prices</summary><ul>{selected.lines.filter(l=>!l.observation).map(l=><li key={l.itemId}>{l.item.name} · {l.item.packLabel}</li>)}</ul></details>}
            {selected.status==='complete'&&!isSharedComparison&&<a className="primary directions" href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lon}`} target="_blank" rel="noreferrer">Get directions <ArrowUpRight size={17}/></a>}
            </>}
            <p className="detail-disclaimer">
              Prices may have changed since the dates shown. Check availability
              with the store.
            </p>
          </>
        )}
      </dialog>
    </>
  );
}
