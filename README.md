# Enterprise Visitor Management System (VMS)

A robust, role-based access clearance and visitor management platform built with React, TypeScript, and Supabase. This system digitizes and secures the end-to-end lifecycle of facility visitors, from employee requests and HR approvals to physical security desk verification.

---

## 🚀 System Architecture & Modules

The platform is divided into three distinct operational portals, ensuring data privacy and streamlined workflows for all stakeholders.

### 1. Employee (EMP) Portal
The starting point for all facility access requests. Employees act as hosts and are responsible for logging expected guests.
* **Pre-Scheduled & Urgent Access:** Support for advanced bookings, recurring visitors, and immediate urgent entry pipelines.
* **Accompanying Contingent Management:** Dynamic forms to register primary visitors along with their entire accompanying team/escorts.
* **Self-Correction Loop:** Ability to edit, update, and resend requests that have been flagged or denied by HR.
* **Live Status Tracking:** Real-time visibility into the approval status (Pending, Approved, Denied) of all initiated visit requests.

### 2. HR / Admin Compliance Portal
The gateway for authorization. HR acts as the middle layer to ensure all visits align with company policy before the guest arrives at the facility.
* **Application Review:** Comprehensive dashboard to review incoming visitor requests, ID types, and stated purposes.
* **Clearance Controls:** One-click approval or denial of visit applications.
* **Audit Remarks:** Ability to leave specific remarks on why a pass was rejected, kicking it back to the employee for correction.

### 3. Security & Reception Terminal
Designed for high-traffic, real-time operations at the physical entry points. Optimized for speed and accuracy.
* **Multi-Desk Architecture:** Supports concurrent operations across multiple security terminals (maximum of 4 active desks).
* **Two-Pane Interface:** Streamlined navigation consisting of a main Queue Dashboard and a deep-dive Verification Page.
* **Smart Priority Queue:** 
  * Displays the expected visitors for the current day.
  * Employs a **Round-Robin** queueing style across available desks to balance load.
  * **Algorithmic Prioritization:** Automatically bubbles high-priority entries (Government officials, Foreign Nationals, Service Personnel, HR guests) to the top over general/standard visitors.
* **Omni-Search:** High-speed search bar filtering expected guests instantly by Name or Government ID Number.
* **Enterprise Verification Matrix:** Selecting a visitor row opens a structured, IT-style profile layout containing:
  * Full identity breakdown and clearance status.
  * **Live Media Capture:** An explicit "Add Image" module to capture and attach real-time photos of the visitor at the desk.
  * **Clearance Checklist:** Step-by-step verification flows to cross-reference physical IDs with database records before finalizing the entry badge.

---

## 🛠 Tech Stack
* **Frontend:** React, TypeScript, Tailwind CSS
* **Backend & Database:** Supabase (PostgreSQL)
* **Security:** Row Level Security (RLS) & Auth Policies
* **Storage:** Supabase Storage (Visitor Documents & Live Capture Images)

---

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd <your-project-directory>

  
