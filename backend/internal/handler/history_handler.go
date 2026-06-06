package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"webconsole/internal/service"
)

// HistoryHandler serves play-history endpoints (record + recent shelf).
type HistoryHandler struct {
	hist  *service.HistoryService
	games *service.GameService
}

// NewHistoryHandler constructs a HistoryHandler.
func NewHistoryHandler(hist *service.HistoryService, games *service.GameService) *HistoryHandler {
	return &HistoryHandler{hist: hist, games: games}
}

type recordBody struct {
	GameID  string `json:"gameId"`
	Seconds int64  `json:"seconds"`
}

// Record handles POST /history/record.
func (h *HistoryHandler) Record(c *gin.Context) {
	var body recordBody
	if err := c.ShouldBindJSON(&body); err != nil || body.GameID == "" {
		fail(c, http.StatusBadRequest, "bad_request", "gameId is required")
		return
	}
	if err := h.hist.Record(body.GameID, body.Seconds); err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	ok(c, http.StatusOK, gin.H{"recorded": true})
}

// Recent handles GET /games/recent.
func (h *HistoryHandler) Recent(c *gin.Context) {
	limit := queryLimit(c, 12)
	games, err := h.hist.Recent(limit)
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	ok(c, http.StatusOK, games)
}

// MostPlayed handles GET /games/most-played.
func (h *HistoryHandler) MostPlayed(c *gin.Context) {
	limit := queryLimit(c, 12)
	games, err := h.games.MostPlayed(limit)
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	ok(c, http.StatusOK, games)
}

// queryLimit parses a "limit" query param with a default and sane bounds.
func queryLimit(c *gin.Context, def int) int {
	limit, err := strconv.Atoi(c.Query("limit"))
	if err != nil || limit <= 0 {
		return def
	}
	if limit > 100 {
		return 100
	}
	return limit
}
