// Package router assembles the Gin engine: REST API under /api/v1, plus
// Range-capable static serving for ROMs, covers and save downloads.
package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"webconsole/internal/config"
	"webconsole/internal/handler"
	"webconsole/internal/repository"
	"webconsole/internal/service"
	"webconsole/internal/web"
)

// New builds and returns the fully wired Gin engine.
func New(cfg config.Config, db *gorm.DB) *gin.Engine {
	gin.SetMode(normalizeMode(cfg.GinMode))

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// Permissive CORS for local dev (frontend on :5173 -> backend on :8080).
	r.Use(corsMiddleware())

	// --- dependency wiring ---
	gameRepo := repository.NewGameRepository(db)
	saveRepo := repository.NewSaveRepository(db)
	histRepo := repository.NewHistoryRepository(db)

	gameSvc := service.NewGameService(gameRepo, cfg.CoversDir())
	saveSvc := service.NewSaveService(saveRepo, cfg.SavesDir())
	histSvc := service.NewHistoryService(histRepo, gameRepo)

	gameHandler := handler.NewGameHandler(gameSvc)
	configHandler := handler.NewConfigHandler(cfg.EmulatorjsDataPath)
	saveHandler := handler.NewSaveHandler(saveSvc)
	histHandler := handler.NewHistoryHandler(histSvc, gameSvc)

	// --- health check ---
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// --- REST API ---
	api := r.Group("/api/v1")
	{
		// Static segments are registered before the :id param so Gin routes
		// /games/recent and /games/most-played ahead of /games/:id.
		api.GET("/games/recent", histHandler.Recent)
		api.GET("/games/most-played", histHandler.MostPlayed)
		api.GET("/games", gameHandler.List)
		api.GET("/games/:id", gameHandler.Get)
		api.PATCH("/games/:id", gameHandler.UpdateMetadata)
		api.POST("/games/:id/cover", gameHandler.UploadCover)

		api.GET("/stats/platforms", gameHandler.PlatformStats)
		api.GET("/tags", gameHandler.Tags)
		api.GET("/config", configHandler.Get)

		api.POST("/history/record", histHandler.Record)

		api.GET("/saves/game/:gameId", saveHandler.ListByGame)
		api.POST("/saves/slot", saveHandler.Upload)
		api.GET("/saves/download/:saveId", saveHandler.Download)
		api.DELETE("/saves/:saveId", saveHandler.Delete)
	}

	// --- static assets (http.FileServer honours Range requests) ---
	r.Static("/roms", cfg.RomsDir())
	r.Static("/covers", cfg.CoversDir())
	// Save-state screenshots are served statically; the binary states go
	// through the /api/v1/saves/download/:id endpoint above.
	r.Static("/saves", cfg.SavesDir())

	// --- embedded SPA (production single-binary) ---
	if web.Available() {
		web.Register(r)
	}

	return r
}

// normalizeMode maps a config string to a valid Gin mode.
func normalizeMode(mode string) string {
	if mode == "release" {
		return gin.ReleaseMode
	}
	return gin.DebugMode
}

// corsMiddleware allows the Vite dev server to call the API cross-origin.
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
