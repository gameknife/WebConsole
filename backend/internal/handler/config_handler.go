package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ConfigHandler serves runtime configuration the frontend needs at startup.
type ConfigHandler struct {
	emulatorjsDataPath string
}

// NewConfigHandler constructs a ConfigHandler.
func NewConfigHandler(emulatorjsDataPath string) *ConfigHandler {
	return &ConfigHandler{emulatorjsDataPath: emulatorjsDataPath}
}

// Get handles GET /config.
func (h *ConfigHandler) Get(c *gin.Context) {
	ok(c, http.StatusOK, gin.H{
		"emulatorjsDataPath": h.emulatorjsDataPath,
	})
}
