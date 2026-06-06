// Package web embeds the built frontend (frontend/dist, copied here by the
// build script) and serves it as a single-page app: real asset paths are served
// from the embedded FS, and any unknown non-API route falls back to index.html
// so client-side routing works.
//
// During development the dist directory contains only a placeholder, so
// Available() reports false and the server relies on the Vite dev proxy instead.
package web

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed all:dist
var distFS embed.FS

// dist returns the embedded dist directory as an fs.FS.
func dist() (fs.FS, error) {
	return fs.Sub(distFS, "dist")
}

// Available reports whether a real built frontend is embedded (index.html
// present). False in dev builds where only the placeholder exists.
func Available() bool {
	sub, err := dist()
	if err != nil {
		return false
	}
	_, err = fs.Stat(sub, "index.html")
	return err == nil
}

// Register mounts the embedded SPA on the engine: static assets are served
// directly, and all other (non-API, non-static) GET routes fall back to
// index.html. Call only when Available() is true.
func Register(r *gin.Engine) {
	sub, err := dist()
	if err != nil {
		return
	}
	fileServer := http.FileServer(http.FS(sub))

	index, err := fs.ReadFile(sub, "index.html")
	if err != nil {
		return
	}

	r.NoRoute(func(c *gin.Context) {
		p := strings.TrimPrefix(c.Request.URL.Path, "/")

		// Never let the SPA shadow the API or backend-served static trees.
		for _, prefix := range []string{"api/", "roms/", "covers/", "saves/"} {
			if strings.HasPrefix(p, prefix) {
				c.Status(http.StatusNotFound)
				return
			}
		}

		// Serve the file if it exists in the embedded FS; otherwise the SPA
		// shell so React Router can handle the route.
		if p != "" {
			if _, statErr := fs.Stat(sub, p); statErr == nil {
				fileServer.ServeHTTP(c.Writer, c.Request)
				return
			}
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", index)
	})
}
