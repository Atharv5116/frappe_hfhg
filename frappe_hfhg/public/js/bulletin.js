// Bulletin Announcement Feature
// Simple, standalone implementation

(function() {
  'use strict';
  
  console.log('[Bulletin] Script loaded - VERSION 2.0 WITH EXPAND BUTTON');
  
  // Set global flag
  window.bulletinScriptLoaded = true;
  
  // Function to get active bulletin from API
  function getActiveBulletin() {
    if (typeof frappe === 'undefined' || !frappe.call) {
      console.log('[Bulletin] Frappe not ready, retrying...');
      setTimeout(getActiveBulletin, 500);
      return;
    }
    
    frappe.call({
      method: "frappe_hfhg.frappe_hfhg.doctype.bulletin.bulletin.get_active_bulletin",
      callback: function(r) {
        if (r && r.message && r.message.message) {
          console.log('[Bulletin] Found active bulletin:', r.message.name);
          showBulletin(r.message.message);
        } else {
          console.log('[Bulletin] No active bulletin found');
        }
      },
      error: function(err) {
        console.error('[Bulletin] API Error:', err);
      }
    });
  }
  
  // Function to extract plain text from HTML
  function extractText(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
  
  // Function to check if we're on home page
  function isHomePage() {
    try {
      if (typeof frappe === 'undefined' || !frappe.get_route) {
        console.log('[Bulletin] Frappe or get_route not available');
        return false;
      }
      
      const route = frappe.get_route();
      const pathname = window.location.pathname;
      
      console.log('[Bulletin] Route:', route, 'Pathname:', pathname);
      
      if (!route || !Array.isArray(route)) {
        console.log('[Bulletin] Invalid route format');
        return false;
      }
      
      // Home page detection:
      // 1. Pathname is exactly '/app/home' or '/app' or '/app/' -> IS home
      // 2. Route is empty array [] -> IS home
      // 3. Route is ['Workspaces', 'HOME'] -> IS home (this is the home workspace)
      // 4. Route has only one element that's 'home' or starts with 'home-' -> IS home
      // 5. Pathname has only one part after /app/ and it's 'home' -> IS home
      
      // First, check pathname - most reliable indicator
      if (pathname === '/app' || pathname === '/app/' || pathname === '/app/home') {
        console.log('[Bulletin] Pathname is /app or /app/home, IS home');
        return true;
      }
      
      // Check if route is ['Workspaces', 'HOME'] - this is the home workspace
      if (route.length === 2 && 
          route[0] === 'Workspaces' && 
          route[1].toUpperCase() === 'HOME') {
        console.log('[Bulletin] Route is [Workspaces, HOME], IS home');
        return true;
      }
      
      // Check if route is empty
      if (route.length === 0) {
        console.log('[Bulletin] Empty route, IS home');
        return true;
      }
      
      // Check if route has single element that's 'home'
      if (route.length === 1) {
        const firstPart = route[0];
        const isHome = firstPart === '' || 
                      firstPart === 'home' || 
                      firstPart.toLowerCase() === 'home' ||
                      firstPart.startsWith('home-');
        console.log('[Bulletin] Single route part:', firstPart, 'Is home:', isHome);
        return isHome;
      }
      
      // Check pathname parts - if only one part and it's 'home', it's home
      const pathParts = pathname.split('/').filter(p => p && p !== 'app');
      if (pathParts.length === 1 && pathParts[0].toLowerCase() === 'home') {
        console.log('[Bulletin] Pathname has single "home" part, IS home');
        return true;
      }
      
      // If route has multiple parts and pathname has multiple parts, it's NOT home
      // Examples: /app/surgery/view/list -> NOT home
      //          /app/lead/view/list -> NOT home
      console.log('[Bulletin] Route has multiple parts and not home workspace, NOT home:', route);
      return false;
      
    } catch(e) {
      console.error('[Bulletin] Error checking route:', e);
      return false;
    }
  }
  
  // Function to show bulletin in navbar
  function showBulletin(message) {
    // Show bulletin on ALL pages (removed home page restriction)
    console.log('[Bulletin] showBulletin called - showing on current page');
    
    // Remove existing bulletin
    const existing = document.getElementById('custom-bulletin-announcement');
    if (existing) {
      existing.remove();
    }
    
    // Extract text from HTML
    const text = extractText(message);
    if (!text || !text.trim()) {
      console.log('[Bulletin] No text to display');
      return;
    }
    
    // Create bulletin container - LIGHT BLUE STYLING - ALIGNED WITH SEARCH BAR
    const bulletin = document.createElement('div');
    bulletin.id = 'custom-bulletin-announcement';
    // Match search bar height (28px) and alignment
    bulletin.style.cssText = 'display:flex;align-items:center;background:linear-gradient(135deg, #f5f9fc 0%, #e8f4f8 100%);border:1px solid #b3d9f2;border-radius:6px;padding:0 12px;margin-right:12px;font-size:13px;color:#6b8ba3;box-shadow:0 1px 4px rgba(179,217,242,0.2), 0 1px 2px rgba(0,0,0,0.05);z-index:9999;flex-shrink:0;transition:all 0.3s ease;position:relative;max-width:400px;font-weight:500;height:28px;line-height:28px;';
    
    // Create icon span - SMALLER TO MATCH HEIGHT
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'margin-right:8px;font-size:14px;flex-shrink:0;display:flex;align-items:center;height:100%;';
    iconSpan.textContent = '📢';
    
    // Create message container
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = 'flex:1;display:flex;align-items:center;min-width:0;';
    
    // Create message span - always start collapsed
    const messageSpan = document.createElement('span');
    messageSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:250px;display:inline-block;vertical-align:middle;line-height:1.4;';
    messageSpan.textContent = text;
    messageSpan.title = text; // Show full text on hover
    
    // Create expand/collapse button - LIGHT BLUE THEME - MATCHES HEIGHT
    const expandButton = document.createElement('button');
    expandButton.type = 'button';
    expandButton.style.cssText = 'margin-left:8px !important;background:linear-gradient(135deg, #9ec5e0 0%, #8bb8d4 100%) !important;border:none !important;border-radius:4px !important;padding:0 10px !important;font-size:11px !important;color:#fff !important;cursor:pointer !important;flex-shrink:0 !important;font-weight:600 !important;white-space:nowrap !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;visibility:visible !important;opacity:1 !important;box-shadow:0 1px 3px rgba(158,197,224,0.3) !important;transition:all 0.2s ease !important;height:22px !important;line-height:22px !important;';
    expandButton.textContent = 'Expand';
    expandButton.title = 'Click to expand message';
    expandButton.id = 'bulletin-expand-button';
    
    // Add hover effect - PALE BLUE THEME
    expandButton.onmouseover = function() {
      this.style.background = 'linear-gradient(135deg, #8bb8d4 0%, #7aa8c8 100%) !important';
      this.style.transform = 'translateY(-1px)';
      this.style.boxShadow = '0 2px 6px rgba(158,197,224,0.4) !important';
    };
    expandButton.onmouseout = function() {
      this.style.background = 'linear-gradient(135deg, #9ec5e0 0%, #8bb8d4 100%) !important';
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 1px 3px rgba(158,197,224,0.3) !important';
    };
    
    console.log('[Bulletin] ===== EXPAND BUTTON CREATED =====');
    console.log('[Bulletin] Expand button created:', expandButton);
    console.log('[Bulletin] Button text:', expandButton.textContent);
    console.log('[Bulletin] Button style:', expandButton.style.cssText);
    
    // Store expanded state
    let isExpanded = false;
    
    // Click handler to expand/collapse
    function toggleExpand(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      
      isExpanded = !isExpanded;
      console.log('[Bulletin] Toggle expand, new state:', isExpanded, 'Text length:', text.length);
      
      if (isExpanded) {
        // Expand - show full text in a popover below the navbar
        expandButton.textContent = 'Collapse';
        expandButton.title = 'Click to collapse message';
        
        // Create a popover element that appears below the bulletin
        let popover = document.getElementById('bulletin-popover');
        if (!popover) {
          popover = document.createElement('div');
          popover.id = 'bulletin-popover';
          popover.style.cssText = 'position:absolute;top:100%;left:0;margin-top:8px;background:linear-gradient(135deg, #f5f9fc 0%, #e8f4f8 100%);border:1px solid #b3d9f2;border-radius:8px;padding:16px 20px;box-shadow:0 4px 12px rgba(179,217,242,0.25), 0 2px 6px rgba(0,0,0,0.1);z-index:10000;min-width:400px;max-width:600px;color:#6b8ba3;font-size:14px;line-height:1.6;word-wrap:break-word;';
          popover.textContent = text;
          bulletin.style.position = 'relative';
          bulletin.appendChild(popover);
        } else {
          popover.style.display = 'block';
        }
        
        // Keep bulletin collapsed but show popover
        messageSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:250px;display:inline-block;vertical-align:middle;line-height:1.4;';
        bulletin.style.height = '28px';
        bulletin.style.padding = '0 12px';
        bulletin.style.maxWidth = '400px';
        bulletin.style.flexWrap = 'nowrap';
        bulletin.style.alignItems = 'center';
        
        messageContainer.style.flexDirection = 'row';
        messageContainer.style.alignItems = 'center';
        messageContainer.style.width = 'auto';
        
        expandButton.style.marginLeft = '8px';
        expandButton.style.height = '22px';
        expandButton.style.padding = '0 10px';
        
        console.log('[Bulletin] ✓ Expanded - Popover shown');
      } else {
        // Collapse - hide popover and show truncated text
        messageSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:250px;display:inline-block;vertical-align:middle;line-height:1.4;';
        expandButton.textContent = 'Expand';
        expandButton.title = 'Click to expand message';
        
        // Hide popover
        const popover = document.getElementById('bulletin-popover');
        if (popover) {
          popover.style.display = 'none';
        }
        
        bulletin.style.height = '28px';
        bulletin.style.padding = '0 12px';
        bulletin.style.maxWidth = '400px';
        bulletin.style.flexWrap = 'nowrap';
        bulletin.style.alignItems = 'center';
        
        messageContainer.style.flexDirection = 'row';
        messageContainer.style.alignItems = 'center';
        messageContainer.style.width = 'auto';
        
        expandButton.style.marginLeft = '8px';
        expandButton.style.height = '22px';
        expandButton.style.padding = '0 10px';
        
        console.log('[Bulletin] ✓ Collapsed');
      }
    }
    
    // Make button clickable
    expandButton.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      toggleExpand(e);
    });
    
    // Append elements - VERIFY EACH STEP
    console.log('[Bulletin] Appending messageSpan to messageContainer');
    messageContainer.appendChild(messageSpan);
    
    console.log('[Bulletin] Appending expandButton to messageContainer');
    messageContainer.appendChild(expandButton);
    console.log('[Bulletin] expandButton parent after append:', expandButton.parentElement);
    console.log('[Bulletin] messageContainer children:', messageContainer.children.length, Array.from(messageContainer.children).map(c => c.tagName + (c.id ? '#' + c.id : '')));
    
    console.log('[Bulletin] Appending iconSpan to bulletin');
    bulletin.appendChild(iconSpan);
    
    console.log('[Bulletin] Appending messageContainer to bulletin');
    bulletin.appendChild(messageContainer);
    console.log('[Bulletin] bulletin children:', bulletin.children.length);
    
    // Verify button is in DOM - IMMEDIATE CHECK
    const btnCheck = document.getElementById('bulletin-expand-button');
    if (btnCheck) {
      console.log('[Bulletin] ✓✓✓ Expand button FOUND in DOM immediately!');
      console.log('[Bulletin] Button parent:', btnCheck.parentElement);
      console.log('[Bulletin] Button visible:', btnCheck.offsetWidth > 0 && btnCheck.offsetHeight > 0);
      console.log('[Bulletin] Button computed display:', window.getComputedStyle(btnCheck).display);
    } else {
      console.error('[Bulletin] ✗✗✗ Expand button NOT in DOM after append!');
      console.error('[Bulletin] messageContainer.innerHTML:', messageContainer.innerHTML.substring(0, 200));
    }
    
    // Also check after a delay
    setTimeout(function() {
      const btn = document.getElementById('bulletin-expand-button');
      if (btn) {
        const style = window.getComputedStyle(btn);
        console.log('[Bulletin] ✓ Expand button verified in DOM');
        console.log('[Bulletin] Display:', style.display, 'Visibility:', style.visibility, 'Opacity:', style.opacity);
        console.log('[Bulletin] Size:', btn.offsetWidth + 'x' + btn.offsetHeight);
        console.log('[Bulletin] Position:', btn.getBoundingClientRect());
      } else {
        console.error('[Bulletin] ✗ Expand button still NOT found after delay!');
      }
    }, 500);
    
    console.log('[Bulletin] Bulletin created with visible Expand button (text length: ' + text.length + ' chars)');
    
    // Find insertion point - try multiple locations
    // Ensure containers allow overflow so expanded content stays visible
    const formInline = document.querySelector('.navbar .form-inline');
    const searchBar = document.querySelector('.navbar .search-bar');
    const navbarCollapse = document.querySelector('.navbar .navbar-collapse');
    
    if (formInline && searchBar) {
      formInline.insertBefore(bulletin, searchBar);
      // Ensure parent containers allow overflow
      if (formInline.parentElement) {
        formInline.parentElement.style.overflow = 'visible';
        formInline.parentElement.style.position = 'relative';
      }
      formInline.style.overflow = 'visible';
      console.log('[Bulletin] Inserted before search bar');
    } else if (formInline) {
      formInline.insertBefore(bulletin, formInline.firstChild);
      if (formInline.parentElement) {
        formInline.parentElement.style.overflow = 'visible';
        formInline.parentElement.style.position = 'relative';
      }
      formInline.style.overflow = 'visible';
      console.log('[Bulletin] Inserted at start of form-inline');
    } else if (navbarCollapse) {
      navbarCollapse.insertBefore(bulletin, navbarCollapse.firstChild);
      if (navbarCollapse.parentElement) {
        navbarCollapse.parentElement.style.overflow = 'visible';
        navbarCollapse.parentElement.style.position = 'relative';
      }
      navbarCollapse.style.overflow = 'visible';
      console.log('[Bulletin] Inserted at start of navbar-collapse');
    } else {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        const container = navbar.querySelector('.container') || navbar;
        container.insertBefore(bulletin, container.firstChild);
        container.style.overflow = 'visible';
        container.style.position = 'relative';
        console.log('[Bulletin] Inserted in navbar container');
      }
    }
    
    // Ensure navbar itself allows overflow
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      navbar.style.overflow = 'visible';
      navbar.style.position = 'relative';
    }
  }
  
  // Initialize when page is ready
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(getActiveBulletin, 1000);
      });
    } else {
      setTimeout(getActiveBulletin, 1000);
    }
    
    // Reload on route changes (to show on all pages)
    if (typeof frappe !== 'undefined' && frappe.router) {
      frappe.router.on('change', function() {
        console.log('[Bulletin] Route changed, reloading bulletin');
        setTimeout(getActiveBulletin, 500);
      });
    } else {
      // Fallback: check route periodically if router not available
      setTimeout(function checkRoute() {
        if (typeof frappe !== 'undefined' && frappe.get_route) {
          getActiveBulletin();
        }
        setTimeout(checkRoute, 2000);
      }, 2000);
    }
  }
  
  // Start initialization
  init();
  
  // Expose test function
  window.testBulletin = function() {
    getActiveBulletin();
  };
  
  console.log('[Bulletin] Initialization complete');
})();

