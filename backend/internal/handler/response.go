// Package handler implements the Gin HTTP handlers for the REST API.
package handler

import "github.com/gin-gonic/gin"

// ok writes a successful `{ "data": ... }` envelope.
func ok(c *gin.Context, status int, data any) {
	c.JSON(status, gin.H{"data": data})
}

// fail writes an error `{ "error": { "code", "message" } }` envelope.
func fail(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}
