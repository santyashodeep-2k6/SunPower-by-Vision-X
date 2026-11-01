# SunFlow 360 — Backend Line-by-Line Code Walkthrough

This document breaks down the most critical source files in the backend codebase line by line.

---

## 1. Application Entry Point: `SunflowApplication.java`

**File Path**: `Backend/src/main/java/com/visionx/sunflow/SunflowApplication.java`

```java
1: package com.visionx.sunflow;
2: 
3: import org.springframework.boot.SpringApplication;
4: import org.springframework.boot.autoconfigure.SpringBootApplication;
5: 
6: @SpringBootApplication
7: public class SunflowApplication {
8: 
9:     public static void main(String[] args) {
10:         SpringApplication.run(SunflowApplication.class, args);
11:     }
12: }
```

### Line-by-Line Breakdown:

| Line | Code | Explanation | Why It Is Needed |
|---|---|---|---|
| `1` | `package com.visionx.sunflow;` | Declares the root namespace for the entire Spring Boot application. | All child packages (`lead`, `survey`, `quotation`, `common`) are subpackages of this root, enabling automatic component scanning. |
| `3-4`| `import org.springframework.boot...;` | Imports core Spring Boot runtime classes. | Provides `SpringApplication` bootstrap runner and `@SpringBootApplication` meta-annotation. |
| `6` | `@SpringBootApplication` | Meta-annotation combining: <br>1. `@Configuration` (defines Spring bean definitions)<br>2. `@EnableAutoConfiguration` (auto-configures DataSource, Hibernate, Jackson, Security based on classpath jars)<br>3. `@ComponentScan` (recursively scans `com.visionx.sunflow.*` for `@Service`, `@Repository`, `@RestController`). | Triggers the complete inversion-of-control (IoC) initialization and auto-wiring of the application. |
| `7` | `public class SunflowApplication` | Main class declaring the entry point. | Required by the JVM and Spring Boot build plugin to locate the application manifest `Main-Class`. |
| `9-11`| `public static void main(...)` <br> `SpringApplication.run(...)` | JVM bootstrap method. Calls `run()`, which creates the `ApplicationContext`, runs Flyway migrations, configures embedded Tomcat on port 8081, and registers all REST endpoints. | Starts the live server instance. |

---

## 2. Security Infrastructure: `SecurityConfig.java`

**File Path**: `Backend/src/main/java/com/visionx/sunflow/common/config/SecurityConfig.java`

### Key Annotations:
- `@Configuration`: Informs Spring's IoC container that this class supplies Bean definitions (`SecurityFilterChain`, `PasswordEncoder`).
- `@EnableWebSecurity`: Activates Spring Security’s web filtering and request interceptor pipeline.
- `@EnableMethodSecurity`: Enables declarative method-level role checks (e.g. `@PreAuthorize("hasRole('ADMIN')")`).

### Key Snippet Analysis:
```java
48: @Bean
49: public PasswordEncoder passwordEncoder() {
50:     return new BCryptPasswordEncoder();
51: }
```
- **Line 50**: Instantiates `BCryptPasswordEncoder`. Hashes passwords with salt rounds (default 10) so raw passwords are never stored in the database.

```java
59: public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
60:     http
61:         .cors(cors -> cors.configurationSource(corsConfigurationSource()))
62:         .csrf(AbstractHttpConfigurer::disable)
63:         .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
```
- **Line 61**: Attaches custom CORS configuration allowing requests from the Vite frontend (`http://localhost:8443`).
- **Line 62**: Disables CSRF (Cross-Site Request Forgery) protection. Because the API uses stateless JWT bearer tokens in the HTTP `Authorization` header rather than browser session cookies, CSRF attacks are impossible by design.
- **Line 63**: Sets `SessionCreationPolicy.STATELESS`. Spring Security will never create an `HttpSession` or store `SecurityContext` in memory across requests.

```java
74:         .requestMatchers("/api/leads", "/api/leads/**").permitAll()
76:         .requestMatchers("/api/surveys", "/api/surveys/**").permitAll()
87:         .anyRequest().authenticated()
```
- **Lines 74-76**: Whitelists public customer onboarding routes (Lead intake, public booking, survey submission) so prospective solar customers can submit inquiries without prior registration.
- **Line 87**: Locks down all administrative, financial, order, and quotation endpoints. Requests without a valid Bearer JWT receive `401 Unauthorized`.

---

## 3. Solar Calculation Engine: `BOMCalculationEngine.java`

**File Path**: `Backend/src/main/java/com/visionx/sunflow/quotation/service/BOMCalculationEngine.java`

### Line-by-Line Breakdown:

```java
30: @Service
31: public class BOMCalculationEngine {
32:     private final ProductRepository productRepository;
33:     private static final BigDecimal COMPOSITE_GST_RATE = new BigDecimal("13.80");
```
- **Line 30**: `@Service` registers this class as a Spring singleton bean for dependency injection into `QuotationService`.
- **Line 34**: Declares the **13.8% Indian Composite Solar GST rate**. (Under Indian GST Council rules, solar projects are billed at 70% goods @ 12% GST + 30% services @ 18% GST = effective composite 13.8%).

```java
54:     // 1. PV Modules Calculation (540W Mono PERC)
55:     int moduleCount = (int) Math.ceil((kw * 1000.0) / 540.0);
56:     Product module = productRepository.findBySku("MOD-540W-MONO")
57:             .orElseGet(() -> createFallbackProduct(...));
58:     items.add(new QuotationItem(module.getId(), module.getName(), ProductCategory.MODULE, BigDecimal.valueOf(moduleCount), module.getUnitPrice()));
```
- **Line 55**: Automatically calculates how many 540W Mono PERC panels are required for the target kW:
  $$\text{moduleCount} = \left\lceil \frac{kW \times 1000}{540} \right\rceil$$
  *Example*: For a 3 kW system: $(3000 / 540) = 5.55 \rightarrow \mathbf{6 \text{ modules}}$ (total 3,240 Wp).
- **Lines 56-58**: Queries the database for the active SKU `MOD-540W-MONO`. If absent, gracefully creates the fallback catalog entry and appends the item to the Bill of Materials.

```java
61:     // 2. Solar Inverter Matching
62:     String inverterSku = kw <= 3.5 ? "INV-3KW-GRID" : (kw <= 6.0 ? "INV-5KW-GRID" : "INV-10KW-GRID");
```
- **Line 62**: Deterministic sizing rule selecting the correct inverter class:
  - $\le 3.5\text{ kW} \rightarrow \text{INV-3KW-GRID}$
  - $3.5\text{ kW} < kw \le 6.0\text{ kW} \rightarrow \text{INV-5KW-GRID}$
  - $> 6.0\text{ kW} \rightarrow \text{INV-10KW-GRID}$

```java
72:     // 4. DC Cabling (15m per kW)
73:     int cableMeters = (int) Math.max(30, kw * 15);
```
- **Line 73**: Sizing rule for 4 sq mm UV-resistant DC solar cabling. Ensures a minimum baseline of 30 meters for string safety, scaling by 15 meters per kW.

```java
121: public BigDecimal calculatePMSuryaGharSubsidy(double capacityKw, String propertyType) {
122:     if (propertyType != null && !propertyType.equalsIgnoreCase("RESIDENTIAL")) {
123:         return BigDecimal.ZERO;
124:     }
125:     if (capacityKw < 1.0) {
126:         return BigDecimal.ZERO;
127:     } else if (capacityKw < 2.0) {
128:         return new BigDecimal("30000.00");
129:     } else if (capacityKw < 3.0) {
130:         return new BigDecimal("60000.00");
131:     } else {
132:         return new BigDecimal("78000.00");
133:     }
134: }
```
- **Lines 122-124**: Validates property type. Under MNRE (Ministry of New and Renewable Energy) rules, commercial and industrial properties receive ₹0 direct PM Surya Ghar consumer subsidy.
- **Lines 128-133**: Exact legal subsidy brackets:
  - 1 kW: **₹30,000**
  - 2 kW: **₹60,000**
  - $\ge 3\text{ kW}$: **₹78,000** (statutory maximum cap).

---

## 4. Quotation Orchestration & Survey Gate: `QuotationService.java`

**File Path**: `Backend/src/main/java/com/visionx/sunflow/quotation/service/QuotationService.java`

### The Survey Gate Invariant:
```java
268: if (quotation.getSurveyId() == null) {
269:     throw new IllegalStateException("Survey Gate Violation: Cannot finalize or send quotation without an associated site survey.");
270: }
...
276: if (survey.getStatus() != SurveyStatus.APPROVED) {
277:     throw new IllegalStateException("Survey Gate Violation: Cannot finalize or send quotation until the site survey is APPROVED. Current survey status: " + survey.getStatus());
278: }
```
- **Why this exists**: In solar engineering, sending a legally binding contract or pricing quote to a customer before an on-site structural/shading feasibility audit is completed leads to financial losses (e.g. unbuildable roofs, electrical panel upgrades). The `SurveyGate` guarantees that quotes can only transition to `SENT` or `ACCEPTED` after certified technical approval.

---

## 5. Centralized Error Handling: `GlobalExceptionHandler.java`

**File Path**: `Backend/src/main/java/com/visionx/sunflow/common/exception/GlobalExceptionHandler.java`

```java
15: @RestControllerAdvice
16: public class GlobalExceptionHandler {
18:     @ExceptionHandler(ResourceNotFoundException.class)
19:     public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
20:         return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
21:     }
23:     @ExceptionHandler(MethodArgumentNotValidException.class)
24:     public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
...
50:     @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
51:     public ResponseEntity<Map<String, Object>> handleBadRequestExceptions(RuntimeException ex) {
52:         return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
53:     }
```
- **Line 15**: `@RestControllerAdvice` intercepts exceptions thrown by any `@RestController` across the entire application before they reach the client.
- **Lines 23-42**: Automatically extracts all `@Valid` Jakarta Bean Validation violations and returns structured JSON with an array of `fieldErrors` (`{ field: "email", message: "must be valid" }`).
- **Lines 50-53**: Safely translates business invariant violations (such as `SurveyGate` rejections) into `HTTP 400 Bad Request` with an exact explanation instead of unhandled `500 Internal Server Error`.

