self.addEventListener("install", (e) => {
  console.log(e);
  
	e.waitUntil(
		caches.open("static").then((cache) => {
			return cache.addAll([
				"./index.html",
				"./css/index.css",
				"./js/index.js",
			]);
		})
	);
});
