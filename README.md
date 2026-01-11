# Office Desk Reservation System

A modern web application for managing office desk reservations. This project allows employees to visualize the office floor plan, check desk availability, and book desks for specific dates and time slots.

## 🚀 Features

- **Interactive Floor Plan**: Visual representation of the office layout with selectable desks.
- **Real-time Availability**: Color-coded status indicators (Available, Reserved by Me, Reserved by Others, Unavailable).
- **Reservation Management**: 
  - Select date and time range (09:00 - 18:00).
  - Conflict detection to prevent double bookings.
  - Local persistence of reservations (currently using LocalStorage).
- **User Authentication**: Login and Registration pages (Mock implementation).
- **Responsive Design**: Modern UI with glassmorphism effects and responsive layout.

## 🛠️ Technology Stack

### Frontend
- **Framework**: [React](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Routing**: [React Router](https://reactrouter.com/)
- **Styling**: CSS Modules / Vanilla CSS with modern variables

### Backend (In Progress)
- **Framework**: ASP.NET Core Web API (.NET 9.0)
- **Language**: C#
- **Documentation**: OpenAPI / Swagger

## 📂 Project Structure

```
├── frontend/          # React client application
│   ├── src/
│   │   ├── pages/     # Page components (Reservation, Login, etc.)
│   │   ├── components/# Reusable UI components (FloorPlan, Header, etc.)
│   │   └── auth/      # Authentication logic
│   └── package.json
│
├── backend/           # .NET Web API
│   ├── Controllers/   # API Endpoints
│   └── Program.cs     # App entry point and configuration
│
└── package.json       # Root configuration (if applicable)
```

## ⚡ Getting Started

### Prerequisites
- **Node.js**: v18 or later
- **.NET SDK**: .NET 9.0 (for backend)

### Running the Frontend
The frontend currently operates independently using LocalStorage for data persistence.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:5173` (or the URL shown in the terminal).

### Running the Backend
*Note: The backend is currently in the initial scaffolding phase.*

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Restore dependencies and run:
   ```bash
   dotnet run
   ```

3. The API will be available at `http://localhost:5032` (or configured port).

## 📝 Usage

1. **Login**: Enter any email to "log in" (e.g., `user@example.com`).
2. **View Floor**: Navigate to the "Floor" page.
3. **Select Date/Time**: Choose your desired date and time slot.
4. **Book a Desk**: Click on an available desk (Green) and confirm the reservation.
5. **View My Reservations**: Desks booked by you will appear in Purple (`Reservations by Me`).

## ⚠️ Current Status
This project is currently a **frontend prototype**. Data is stored in the browser's `localStorage` and will persist across reloads but not across different devices/browsers. The .NET backend integration is planned for future updates.
