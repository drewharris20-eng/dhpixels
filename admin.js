const urlOk = window.SUPABASE_URL && !window.SUPABASE_URL.includes("PASTE_");
const keyOk = window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("PASTE_");

const setupWarning = document.getElementById("setupWarning");
const loginBox = document.getElementById("loginBox");
const uploadBox = document.getElementById("uploadBox");
const loginStatus = document.getElementById("loginStatus");
const uploadStatus = document.getElementById("uploadStatus");
const gallerySlugInput = document.getElementById("gallerySlug");
const clientLinkInput = document.getElementById("clientLink");
const adminGrid = document.getElementById("adminGrid");

let supabaseClient = null;

if (!urlOk || !keyOk) {
  setupWarning.classList.remove("hidden");
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

function updateClientLink() {
  const slug = cleanSlug(gallerySlugInput.value || "sarah-jake");
  const link = `${window.location.origin}/gallery.html?gallery=${encodeURIComponent(slug)}`;
  clientLinkInput.value = link;
}

async function init() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    showUpload();
  }

  gallerySlugInput.addEventListener("input", () => {
    gallerySlugInput.value = cleanSlug(gallerySlugInput.value);
    updateClientLink();
    loadAdminGallery();
  });

  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("uploadBtn").addEventListener("click", uploadFiles);
  document.getElementById("uploadBannerBtn").addEventListener("click", uploadBanner);
  document.getElementById("copyLinkBtn").addEventListener("click", copyClientLink);

  updateClientLink();
}

async function login() {
  loginStatus.textContent = "Logging in...";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    loginStatus.textContent = error.message;
    return;
  }

  loginStatus.textContent = "Logged in.";
  showUpload();
}

async function logout() {
  await supabaseClient.auth.signOut();
  uploadBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
}

function showUpload() {
  loginBox.classList.add("hidden");
  uploadBox.classList.remove("hidden");
  updateClientLink();
  loadAdminGallery();
}


async function uploadBanner() {
  const slug = cleanSlug(gallerySlugInput.value);
  const input = document.getElementById("bannerInput");
  const file = input.files[0];

  if (!slug) {
    uploadStatus.textContent = "Add a gallery slug first.";
    return;
  }

  if (!file) {
    uploadStatus.textContent = "Choose a banner photo first.";
    return;
  }

  uploadStatus.textContent = "Uploading banner photo...";

  const extension = file.name.split(".").pop().toLowerCase() || "jpg";
  const path = `${slug}/_banner.${extension}`;

  const { error } = await supabaseClient.storage
    .from(window.SUPABASE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true
    });

  if (error) {
    uploadStatus.textContent = `Banner upload failed: ${error.message}`;
    return;
  }

  input.value = "";
  uploadStatus.textContent = "Banner photo uploaded.";
  await loadAdminGallery();
}


async function uploadFiles() {
  const slug = cleanSlug(gallerySlugInput.value);
  const files = Array.from(document.getElementById("fileInput").files);

  if (!slug) {
    uploadStatus.textContent = "Add a gallery slug first.";
    return;
  }

  if (!files.length) {
    uploadStatus.textContent = "Choose photos first.";
    return;
  }

  uploadStatus.textContent = `Uploading ${files.length} photo(s)...`;

  let uploaded = 0;

  for (const file of files) {
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-");

    const path = `${slug}/${Date.now()}-${safeName}`;

    const { error } = await supabaseClient.storage
      .from(window.SUPABASE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) {
      uploadStatus.textContent = `Upload stopped: ${error.message}`;
      return;
    }

    uploaded++;
    uploadStatus.textContent = `Uploaded ${uploaded} of ${files.length}...`;
  }

  uploadStatus.textContent = `Done. Uploaded ${uploaded} photo(s).`;
  document.getElementById("fileInput").value = "";
  await loadAdminGallery();
}

async function loadAdminGallery() {
  if (!supabaseClient) return;

  const slug = cleanSlug(gallerySlugInput.value);
  if (!slug) return;

  const { data, error } = await supabaseClient.storage
    .from(window.SUPABASE_BUCKET)
    .list(slug, {
      limit: 100,
      sortBy: { column: "name", order: "asc" }
    });

  adminGrid.innerHTML = "";

  if (error) {
    adminGrid.innerHTML = `<p class="status">${error.message}</p>`;
    return;
  }

  const files = (data || []).filter(item => item.name && item.metadata && !item.name.startsWith("_banner."));

  if (!files.length) {
    adminGrid.innerHTML = `<p class="muted">No photos uploaded yet.</p>`;
    return;
  }

  files.forEach(item => {
    const path = `${slug}/${item.name}`;
    const { data: publicData } = supabaseClient.storage
      .from(window.SUPABASE_BUCKET)
      .getPublicUrl(path);

    const card = document.createElement("div");
    card.className = "photo-card";
    card.innerHTML = `<img src="${publicData.publicUrl}" alt="">`;
    adminGrid.appendChild(card);
  });
}

async function copyClientLink() {
  updateClientLink();
  await navigator.clipboard.writeText(clientLinkInput.value);
  uploadStatus.textContent = "Client gallery link copied.";
}
