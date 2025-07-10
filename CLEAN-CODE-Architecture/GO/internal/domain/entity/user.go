package entity

import "time"

// User represents our core domain entity, completely independent of any framework
type User struct {
	ID         uint
	Username   string
	FirstName  string
	LastName   string
	Email      string
	Phone      string
	Address    string
	Password   string
	ProfilePic string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}
