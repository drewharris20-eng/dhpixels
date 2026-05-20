const galleryStatus = document.getElementById("galleryStatus");
const galleryGrid = document.getElementById("galleryGrid");
const gallerySlugInput = document.getElementById("gallerySlug");
const galleryTitle = document.getElementById("galleryTitle");
const galleryBanner = document.getElementById("galleryBanner");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const favoriteLightbox = document.getElementById("favoriteLightbox");
const downloadLightbox = document.getElementById("downloadLightbox");

let supabaseClient = null;
let currentSlug = "";
let photos = [];
let currentIndex = 0;

const urlOk = window.SUPABASE_URL && !window.SUPABASE_URL.includes("PASTE_");
const keyOk = window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("PASTE_");

if (!urlOk || !keyOk) {
  galleryStatus.textContent = "Add your Supabase URL and anon key inside supabase-config.js.";
} else {
  supabaseClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  init();
}

function cleanSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function favoriteKey(slug) {
  return `favorites:${slug}`;
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(favoriteKey(currentSlug))) || [];
  } catch {
    return [];
  }
}

function saveFavorites(favs) {
  localStorage.setItem(favoriteKey(currentSlug), JSON.stringify(favs));
}

function isFavorite(path) {
  return getFavorites().includes(path);
}

function toggleFavorite(path) {
  const favs = getFavorites();
  const next = favs.includes(path)
    ? favs.filter(item => item !== path)
    : [...favs, path];

  saveFavorites(next);
  renderGallery();
  updateLightbox();
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const querySlug = cleanSlug(params.get("gallery") || "");
  gallerySlugInput.value = querySlug;

  document.getElementById("loadBtn").addEventListener("click", () => {
    const slug = cleanSlug(gallerySlugInput.value);
    if (slug) {
      const url = new URL(window.location.href);
      url.searchParams.set("gallery", slug);
      window.history.pushState({}, "", url);
      loadGallery(slug);
    }
  });

  document.getElementById("downloadSelectedBtn").addEventListener("click", downloadFavorites);
  document.getElementById("downloadAllBtn").addEventListener("click", downloadAll);
  document.getElementById("closeLightbox").addEventListener("click", closeLightbox);
  document.getElementById("prevPhoto").addEventListener("click", previousPhoto);
  document.getElementById("nextPhoto").addEventListener("click", nextPhoto);
  favoriteLightbox.addEventListener("click", () => toggleFavorite(photos[currentIndex].path));

  document.addEventListener("keydown", event => {
    if (lightbox.classList.contains("hidden")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") previousPhoto();
    if (event.key === "ArrowRight") nextPhoto();
  });

  if (querySlug) {
    loadGallery(querySlug);
  } else {
    galleryStatus.textContent = "Enter a gallery slug to load photos.";
  }
}

async function loadGallery(slug) {
  currentSlug = cleanSlug(slug);
  gallerySlugInput.value = currentSlug;
  galleryTitle.textContent = titleFromSlug(currentSlug) || "Wedding Gallery";
  galleryStatus.textContent = "Loading gallery...";
  galleryGrid.innerHTML = "";

  const { data, error } = await supabaseClient.storage
    .from(window.SUPABASE_BUCKET)
    .list(currentSlug, {
      limit: 500,
      sortBy: { column: "name", order: "asc" }
    });

  if (error) {
    galleryStatus.textContent = error.message;
    return;
  }

  const files = (data || []).filter(item => item.name && item.metadata);
  const bannerFile = files.find(item => item.name.startsWith("_banner."));
  const imageFiles = files.filter(item => !item.name.startsWith("_banner."));

  if (bannerFile) {
    const bannerPath = `${currentSlug}/${bannerFile.name}`;
    const { data: bannerData } = supabaseClient.storage
      .from(window.SUPABASE_BUCKET)
      .getPublicUrl(bannerPath);

    galleryBanner.style.backgroundImage = `url("${bannerData.publicUrl}")`;
    galleryBanner.classList.remove("hidden");
  } else {
    galleryBanner.style.backgroundImage = "";
    galleryBanner.classList.add("hidden");
  }

  photos = imageFiles.map(item => {
    const path = `${currentSlug}/${item.name}`;
    const { data: publicData } = supabaseClient.storage
      .from(window.SUPABASE_BUCKET)
      .getPublicUrl(path);

    return {
      name: item.name,
      path,
      url: publicData.publicUrl
    };
  });

  if (!photos.length) {
    galleryStatus.textContent = "No photos found for this gallery yet.";
    return;
  }

  galleryStatus.textContent = `${photos.length} photo(s) loaded.`;
  renderGallery();
}

function renderGallery() {
  galleryGrid.innerHTML = "";

  photos.forEach((photo, index) => {
    const card = document.createElement("article");
    card.className = "photo-card";

    const active = isFavorite(photo.path) ? "active" : "";

    card.innerHTML = `
      <img src="${photo.url}" alt="${photo.name}" loading="lazy">
      <div class="photo-actions">
        <button class="icon-btn ${active}" data-fav="${photo.path}">♥ Favorite</button>
        <a class="icon-btn" href="${photo.url}" download="${photo.name}">Download</a>
      </div>
    `;

    card.querySelector("img").addEventListener("click", () => openLightbox(index));
    card.querySelector("[data-fav]").addEventListener("click", event => {
      event.stopPropagation();
      toggleFavorite(photo.path);
    });

    galleryGrid.appendChild(card);
  });
}

function openLightbox(index) {
  currentIndex = index;
  lightbox.classList.remove("hidden");
  updateLightbox();
}

function closeLightbox() {
  lightbox.classList.add("hidden");
}

function updateLightbox() {
  const photo = photos[currentIndex];
  if (!photo) return;

  lightboxImage.src = photo.url;
  lightboxImage.alt = photo.name;
  downloadLightbox.href = photo.url;
  downloadLightbox.download = photo.name;
  favoriteLightbox.textContent = isFavorite(photo.path) ? "Remove Favorite" : "Favorite";
}

function previousPhoto() {
  currentIndex = (currentIndex - 1 + photos.length) % photos.length;
  updateLightbox();
}

function nextPhoto() {
  currentIndex = (currentIndex + 1) % photos.length;
  updateLightbox();
}

async function downloadFavorites() {
  const favs = getFavorites();
  const selected = photos.filter(photo => favs.includes(photo.path));

  if (!selected.length) {
    galleryStatus.textContent = "No favorites selected yet.";
    return;
  }

  await downloadZip(selected, `${currentSlug}-favorites.zip`);
}

async function downloadAll() {
  if (!photos.length) {
    galleryStatus.textContent = "No photos loaded.";
    return;
  }

  await downloadZip(photos, `${currentSlug}-full-gallery.zip`);
}

async function downloadZip(photoList, zipName) {
  galleryStatus.textContent = `Preparing ${photoList.length} photo(s)...`;

  const zip = new JSZip();

  for (let i = 0; i < photoList.length; i++) {
    const photo = photoList[i];
    galleryStatus.textContent = `Adding ${i + 1} of ${photoList.length}...`;

    const response = await fetch(photo.url);
    const blob = await response.blob();
    zip.file(photo.name, blob);
  }

  galleryStatus.textContent = "Creating zip file...";
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, zipName);
  galleryStatus.textContent = "Download ready.";
}
